const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

function createMissingSupabaseClient() {
  const error = new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY).');
  const thrower = () => {
    throw error;
  };

  return {
    from: thrower,
    rpc: thrower,
    storage: {
      from: () => ({
        upload: thrower,
        remove: thrower,
        getPublicUrl: thrower,
      }),
    },
  };
}

const supabase = (!supabaseUrl || !supabaseKey)
  ? (console.warn('[supabase] client disabled: missing env vars'), createMissingSupabaseClient())
  : createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
