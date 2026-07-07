// Compte fondateur : publie des missions sans abonnement (cote client ET en
// base — voir is_founder() dans supabase/migrations/0007_signup_subscription.sql).
export const FOUNDER_EMAILS = ['fodesanoussy178@gmail.com'];

export function isFounder(email: string | null | undefined): boolean {
  return !!email && FOUNDER_EMAILS.includes(email.toLowerCase());
}
