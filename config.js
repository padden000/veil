/* Supabase connection for login and match submissions.
   Both values are safe to publish (the publishable key only allows what the database rules allow).
   Leave them empty to run the site without login / submissions. */
window.VEIL_CONFIG = {
  supabaseUrl: "",   // e.g. "https://abcdefghijkl.supabase.co"
  supabaseKey: ""    // the "Publishable key" (sb_publishable_...)
};
