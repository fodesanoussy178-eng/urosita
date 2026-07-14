import { supabase } from '@/lib/supabase';
import type { KycStatus, KycDocumentType } from '@/types/database.types';

// Vue fondateur d'un dossier KYC : ni le document, ni l'IBAN complet ne sont
// exposes (seuls les 4 derniers chiffres, via la RPC security definer).
export interface FounderVerification {
  id: string;
  user_id: string;
  full_name: string | null;
  status: KycStatus;
  document_type: KycDocumentType | null;
  iban_masked: string | null;
  missing_info: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface FounderHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  source: string;
  created_at: string;
}

export type FounderDecision = 'verified' | 'rejected' | 'info_required';

// Verifie le code cote serveur (la RPC leve une exception si invalide) et
// renvoie la liste des dossiers, deja triee (en attente d'abord).
export async function founderListVerifications(passcode: string): Promise<FounderVerification[]> {
  const { data, error } = await supabase.rpc('founder_list_verifications', { p_passcode: passcode });
  if (error) throw error;
  return (data ?? []) as FounderVerification[];
}

export async function founderVerificationHistory(
  passcode: string,
  verificationId: string,
): Promise<FounderHistoryEntry[]> {
  const { data, error } = await supabase.rpc('founder_verification_history', {
    p_passcode: passcode,
    p_verification_id: verificationId,
  });
  if (error) throw error;
  return (data ?? []) as FounderHistoryEntry[];
}

// Action de SIMULATION : valider / refuser / demander un document. En mode
// 'lemonway', ces actions sont masquees cote UI et le statut vient des webhooks.
export async function founderSetStatus(
  passcode: string,
  verificationId: string,
  status: FounderDecision,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('founder_set_verification_status', {
    p_passcode: passcode,
    p_verification_id: verificationId,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}
