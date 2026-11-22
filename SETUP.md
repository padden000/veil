# VEIL のログインと試合登録の準備手順

このサイトでは、パスワードを一切持ちません。ログインは Discord で行い、その仕組みは Supabase が受け持ちます。
ここに書いた作業は、あなたのアカウントでしかできない部分です。終わったら、手順 5 の **2つの値** を送ってください。

所要時間の目安は 30〜40 分です。画面のボタン名は英語で、少し変わっていることがあります。

---

## 0. サイトを Cloudflare Pages に置く(先にやる)

ログインのあとで戻ってくる先として、サイトの URL が必要になります。

1. https://dash.cloudflare.com で無料アカウントを作ります。
2. 左のメニューの **Workers & Pages** → **Create** → **Pages** → **Connect to Git** を選びます。
3. GitHub とつないで `padden000/veil` を選びます。
4. ビルドの設定は次のとおりです。
   - Framework preset:**None**
   - Build command:空欄
   - Build output directory:空欄
5. Project name を `veil-jpmeta` にして **Save and Deploy** を押します(作成済み)。
6. URL は `https://veil-jpmeta.pages.dev` です。以下では **サイトURL** と呼びます。

## 1. Supabase のプロジェクトを作る

1. https://supabase.com で **Start your project** を押し、GitHub アカウントでサインアップします。
2. **New project** で、次のように設定します。
   - Name:`veil`
   - Database Password:**Generate** を押して自動で作ります。これは Supabase の管理用パスワードです。パスワード管理アプリなどに保管してください。**Claude には送らないでください。**
   - Region:**Northeast Asia (Tokyo)**
3. **Create new project** を押し、準備が終わるまで 1〜2 分待ちます。

## 2. データベースを作る(SQL を 1 回貼るだけ)

1. 左のメニューの **SQL Editor** を開き、**New query** を押します。
2. `db/setup.sql` の中身を全部コピーして貼り付け、**Run** を押します。
3. 最後に `Success` と出れば完了です。テーブル、承認の仕組み、133 体のヒーロー、15 分ごとの集計更新がまとめて作られます。

## 3. Discord のアプリを作る

1. Supabase の左メニューの **Authentication** → **Sign In / Providers**(または **Providers**)→ **Discord** を開きます。
2. そこに表示される **Callback URL** をコピーします。`https://xxxx.supabase.co/auth/v1/callback` のような形です。
3. https://discord.com/developers/applications を開き、**New Application** を押して、名前を `VEIL` にして作ります。
4. 左の **OAuth2** を開いて、次の 3 つをします。
   - **Client ID** をコピーします。
   - **Client Secret** の **Reset Secret** を押して表示し、コピーします。
   - **Redirects** の **Add Redirect** に、手順 2 の Callback URL を貼って **Save Changes** を押します。

## 4. Supabase で Discord ログインを有効にする

1. 手順 3 で開いた Supabase の **Discord** の画面で、**Enable** をオンにします。
2. Client ID と Client Secret を貼って **Save** を押します。
3. **Authentication** → **URL Configuration** を開いて、次の 2 か所を設定します。
   - **Site URL**:サイトURL(例:`https://veil-jpmeta.pages.dev`)
   - **Redirect URLs** に次を追加します。
     - `https://veil-jpmeta.pages.dev/**`(サイトURL の後ろに `/**`)
     - `http://localhost:8765/**`(手元で試すとき用。なくても構いません)

## 5. 2つの値を Claude に送る

**Project Settings** → **API Keys**(または **Data API**)で、次の 2 つをコピーして送ってください。

| 送るもの | 形 |
|---|---|
| Project URL | `https://xxxx.supabase.co` |
| Publishable key | `sb_publishable_...` |

この 2 つは、サイトに書いて公開しても大丈夫な値です。

**送らないもの**:Secret key(`sb_secret_...`)、`service_role` キー、Database Password、Discord の Client Secret。

---

## 6. つながったあとにやること(Claude がサイトを更新してから)

1. サイトURL を開き、右上の **LOGIN** から Discord でログインします。
2. Supabase の SQL Editor で次を実行して、自分を管理者にします。一番最初にログインした人が管理者になります。
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from public.profiles order by created_at limit 1);
   ```
3. `db/import_sheet.sql` を貼って **Run** します。シートの 68 試合が、承認済みとして取り込まれます。
4. サイトの **アカウント** → **承認する** に、メンバーの一覧が出ます。友達がログインしたら、ここで役割を変えられます。

| 役割 | できること |
|---|---|
| 一般 | 試合を登録できる。承認されてから集計に入る |
| 信頼ユーザー | 登録した試合がすぐ集計に入る(同じ試合がすでにあるときだけ承認待ち) |
| 承認係 | 承認待ちの試合を承認・却下できる |
| 管理者 | 上のすべてと、役割の変更 |

## 保存する試合数を変える

承認済みの試合は、新しいものから **100,000 試合** まで残します(初期値)。それより古い試合は、毎日朝 4 時に自動で消えます。却下した試合は、30 日たつと消えます。

数を変えるときは、SQL Editor で次を実行します(例:50,000 にする)。
```sql
update public.settings set value = '50000' where key = 'max_matches';
```

- 目安:100,000 試合で約 200MB です。無料枠の 500MB に収まります。
- 消える試合は、試合をした日が古い順です。シートから取り込んだ試合も、古くなれば消えます。

**2026-11-21 より前に `setup.sql` を実行していた場合**:この機能を足すために、`db/retention.sql` を 1 回貼って実行してください。何回実行しても大丈夫です。

## 困ったとき

- **ログインしたら「redirect」関係のエラーが出る**:手順 4 の Redirect URLs と、手順 3 の Discord の Redirects を見直してください。
- **プロジェクトが止まった(Paused)**:Supabase の画面から **Restore** で戻せます。1 週間だれも使わないと止まり、止まる前にメールが届きます。
- **シートを更新したとき**:`make_roster.py` で roster.js を作り直したあと、`db/gen_sql.py` を実行すると `heroes.sql` と `import_sheet.sql` も作り直されます。
