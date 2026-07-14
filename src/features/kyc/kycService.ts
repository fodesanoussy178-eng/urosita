import { supabase } from '@/lib/supabase';
import type { Database, KycStatus, KycDocumentType } from '@/types/database.types';

export type KycVerification = Database['public']['Tables']['kyc_verifications']['Row'];

export const KYC_BUCKET = 'kyc-documents';

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  unverified: 'Non vérifié',
  info_required: 'Informations à compléter',
  pending: 'Vérification en cours',
  verified: 'Vérifié',
  rejected: 'Refusé',
};

export const KYC_DOCUMENT_LABELS: Record<KycDocumentType, string> = {
  id_card: "Carte d'identité",
  passport: 'Passeport',
  residence_permit: 'Titre de séjour',
};

// Un compte non verifie ne peut pas recevoir de paiement. Double barriere :
// ce garde cote client + un trigger SQL sur la table payments.
export function isPaymentBlocked(status: KycStatus | null | undefined): boolean {
  return status !== 'verified';
}

// Le parcours KYC s'affiche des qu'un travailleur accepte sa premiere mission
// remuneree, tant que son dossier n'est ni soumis (pending) ni valide (verified).
export function needsVerificationPrompt(status: KycStatus | null | undefined): boolean {
  return status == null || status === 'unverified' || status === 'info_required';
}

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

// Validation legere cote client : longueur FR/IBAN plausible. La verification
// reelle appartient au prestataire KYC (Lemonway).
export function isPlausibleIban(iban: string): boolean {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(clean);
}

export async function fetchMyVerification(userId: string): Promise<KycVerification | null> {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Cree une ligne "unverified" quand l'utilisateur accepte sa 1re mission
// remuneree, pour materialiser l'etat "a completer" meme s'il ferme le
// parcours sans soumettre.
export async function ensureVerificationRow(userId: string): Promise<KycVerification> {
  const existing = await fetchMyVerification(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('kyc_verifications')
    .insert({ user_id: userId, status: 'unverified' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Upload de la piece d'identite dans le bucket PRIVE, sous un dossier au nom
// de l'utilisateur (impose par la policy RLS storage). Le contenu n'est jamais
// stocke en table.
export async function uploadIdDocument(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${userId}/piece-identite-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

export interface SubmitVerificationInput {
  userId: string;
  fullName: string;
  iban: string;
  documentType: KycDocumentType;
  documentPath: string;
}

// Soumet le dossier : passe le statut a 'pending' (verification en cours).
// L'utilisateur ne peut jamais s'auto-verifier (garanti par la RLS).
export async function submitVerification(input: SubmitVerificationInput): Promise<KycVerification> {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .upsert(
      {
        user_id: input.userId,
        full_name: input.fullName.trim(),
        iban: input.iban.replace(/\s+/g, '').toUpperCase(),
        document_type: input.documentType,
        document_path: input.documentPath,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        missing_info: null,
        rejection_reason: null,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
