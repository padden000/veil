/* VEIL build for Cloudflare Pages.
   - Copies only the files the site needs into dist/ (db/, docs, scripts and the local config.js stay out).
   - Writes dist/config.js from the environment variables SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
   Cloudflare Pages settings:  Build command = node tools/build.js   Build output directory = dist
   Run locally the same way to check what would be published:  node tools/build.js */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "dist");
const onCloudflare = process.env.CF_PAGES === "1";

/* never published: folders and files that are only for building, the database, or notes */
const SKIP_DIRS = new Set(["dist", "tools", "db", "picture", "_test", "node_modules", ".git", ".github", ".wrangler"]);
const SKIP_FILES = new Set(["config.js", "config.example.js", ".gitignore", "package.json", "package-lock.json", "wrangler.toml"]);
const SKIP_EXT = new Set([".md", ".py", ".sql", ".xlsx", ".log"]);

function fail(msg) { console.error("[VEIL build] " + msg); process.exit(1); }

/* ---- Supabase values from the environment ---- */
const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

if (key) {
  /* the secret key must never reach the browser: stop the build if it was put here by mistake */
  if (/^sb_secret_/.test(key)) fail("SUPABASE_PUBLISHABLE_KEY に Secret key(sb_secret_...)が入っています。Publishable key(sb_publishable_...)に替えてください。");
  if (/^eyJ/.test(key)) {
    let role = "";
    try { role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role || ""; } catch (e) { /* not a JWT */ }
    if (role === "service_role") fail("SUPABASE_PUBLISHABLE_KEY に service_role キーが入っています。Publishable key に替えてください。");
    if (role !== "anon") fail("SUPABASE_PUBLISHABLE_KEY の形が読めません。sb_publishable_... の値を入れてください。");
  } else if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    fail("SUPABASE_PUBLISHABLE_KEY は sb_publishable_ で始まる値を入れてください。");
  }
}
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) fail("SUPABASE_URL は https://xxxx.supabase.co の形で入れてください。");
if (!!url !== !!key) fail("SUPABASE_URL と SUPABASE_PUBLISHABLE_KEY は2つともそろえて入れてください。");
if (!url && onCloudflare) fail("Cloudflare Pages の環境変数 SUPABASE_URL と SUPABASE_PUBLISHABLE_KEY が設定されていません。");
if (!url) console.warn("[VEIL build] 環境変数がないので、ログインなしのサイトとして作ります。");

/* ---- copy the public files ---- */
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let count = 0;
function copyDir(from, to) {
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, ent.name), dst = path.join(to, ent.name);
    const top = from === root;
    if (ent.isDirectory()) {
      if (top && SKIP_DIRS.has(ent.name)) continue;
      if (ent.name.startsWith(".")) continue;
      fs.mkdirSync(dst, { recursive: true });
      copyDir(src, dst);
    } else if (ent.isFile()) {
      if (top && SKIP_FILES.has(ent.name)) continue;
      if (ent.name.startsWith(".") || SKIP_EXT.has(path.extname(ent.name).toLowerCase())) continue;
      fs.copyFileSync(src, dst);
      count++;
    }
  }
}
copyDir(root, out);

/* ---- config.js for the browser ---- */
fs.writeFileSync(path.join(out, "config.js"),
  "/* Made by tools/build.js from the Cloudflare Pages environment variables. Do not edit. */\n" +
  "window.VEIL_CONFIG = " + JSON.stringify({ supabaseUrl: url, supabaseKey: key }, null, 2) + ";\n");

console.log("[VEIL build] " + (count + 1) + " files -> dist/" + (url ? " (Supabase: " + url + ")" : " (no login)"));
