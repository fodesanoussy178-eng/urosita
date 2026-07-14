export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Mode du parcours KYC. 'simulation' : la validation se fait a la main dans le
// tableau de bord fondateur. 'lemonway' : les statuts viennent des webhooks
// Lemonway (Edge Function) et les actions manuelles sont masquees.
export const kycMode: 'simulation' | 'lemonway' =
  (import.meta.env.VITE_KYC_MODE as string | undefined) === 'lemonway' ? 'lemonway' : 'simulation';
