const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.BMW_SUPABASE_URL;
const supabaseKey = process.env.BMW_SUPABASE_SERVICE_ROLE_KEY || process.env.BMW_SUPABASE_KEY;

function createMissingSupabaseClient() {
  const error = new Error('Supabase (BMW) is not configured. Set BMW_SUPABASE_URL and BMW_SUPABASE_SERVICE_ROLE_KEY (or BMW_SUPABASE_KEY).');
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
  ? (console.warn('[supabase] BMW client disabled: missing env vars'), createMissingSupabaseClient())
  : createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
