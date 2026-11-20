const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Backend-only Supabase client using service_role key for Storage operations.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the frontend!
let supabaseAdmin = null;

if (env.supabase.isConfigured) {
  supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

module.exports = supabaseAdmin;
