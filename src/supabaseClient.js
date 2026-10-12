import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://abcaveuzsenckhislsjf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_X-YuDA1KPq0TLYCeCKl6KQ_o3CJIoDH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
