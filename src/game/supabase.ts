import { createClient } from '@supabase/supabase-js';

/**
 * TERRITORY 2.0 staging guard.
 *
 * The new app must NEVER write to the currently active TERRITORY 1.0 database.
 * An explicit staging opt-in and independent project URL are required before
 * enabling any live authentication or cloud-save operations.
 *
 * The visual prototype at public/v2-preview.html does not import this module.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const stagingApproved = import.meta.env.VITE_V2_STAGING_APPROVED === 'yes';
const isLegacyProduction = supabaseUrl.includes('wmyrdpbwlkzsktnhookx');
const isApprovedV2Staging = supabaseUrl === 'https://ksikzkrvuuhermhnbycn.supabase.co';

if (!stagingApproved || isLegacyProduction || !isApprovedV2Staging || !supabaseAnonKey) {
  throw new Error(
    'TERRITORY 2.0 cloud backend disabled. Only the approved V2 staging Supabase project is allowed.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
