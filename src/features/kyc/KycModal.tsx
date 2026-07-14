import { useRef, useState } from 'react';
import { T, FONT, inp } from '@/components/ui/theme';
import { Fld } from '@/components/ui/Fld';
import type { KycDocumentType } from '@/types/database.types';
import {
  KYC_DOCUMENT_LABELS,
  isPlausibleIban,
  submitVerification,
  uploadIdDocument,
  type KycVerification,
} from './kycService';

const SHEET = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.82)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 60,
} as const;

const DOC_TYPES: KycDocumentType[] = ['id_card', 'passport', 'residence_permit'];

// Parcours de verification affiche des la 1re mission remuneree acceptee.
// On demande le strict necessaire : une piece d'identite + un IBAN au nom de
// l'utilisateur. Les informations complementaires ne sont demandees que si le
// fondateur / Lemonway les reclame (missing_info -> banniere dediee).
export function KycModal({
  userId,
  defaultFullName,
  missingInfo,
  onClose,
  onSubmitted,
}: {
  userId: string;
  defaultFullName?: string;
  missingInfo?: string | null;
  onClose: () => void;
  onSubmitted: (v: KycVerification) => void;
}) {
  const [docType, setDocType] = useState<KycDocumentType>('id_card');
  const [file, setFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState(defaultFullName ?? '');
  const [iban, setIban] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ready = Boolean(file) && fullName.trim().length >= 2 && isPlausibleIban(iban);

  async function submit() {
    if (!ready || !file || busy) return;
    setError(null);
    setBusy(true);
    try {
      const documentPath = await uploadIdDocument(userId, file);
      const v = await submitVerification({ userId, fullName, iban, documentType: docType, documentPath });
      onSubmitted(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={SHEET} onClick={onClose}>
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          background: T.card,
          borderRadius: '20px 20px 0 0',
          padding: '18px 16px 28px',
          fontFamily: FONT,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: T.text }}>Vérifie ton compte</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2, lineHeight: 1.5 }}>
              Étape obligatoire avant d'être payé pour une mission rémunérée.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: T.row, border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: T.sub, fontSize: 14, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {missingInfo && (
          <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 9, padding: '10px 12px', margin: '4px 0 14px', fontSize: 11, color: T.amber, lineHeight: 1.5 }}>
            ⓘ Complément demandé : {missingInfo}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <Fld label="Type de pièce d'identité">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DOC_TYPES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDocType(d)}
                  style={{ background: docType === d ? '#fff' : T.row, color: docType === d ? '#000' : T.sub, border: `1px solid ${docType === d ? '#fff' : T.cb}`, borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  {KYC_DOCUMENT_LABELS[d]}
                </button>
              ))}
            </div>
          </Fld>

          <Fld label="Photo / scan de la pièce">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              aria-label="Pièce d'identité"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ width: '100%', background: T.row, border: `1.5px dashed ${file ? T.greenBorder : T.cb}`, borderRadius: 9, padding: '14px 13px', fontSize: 12, color: file ? T.green : T.sub, cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}
            >
              {file ? `✓ ${file.name}` : '＋ Choisir un fichier (photo ou PDF)'}
            </button>
            <div style={{ fontSize: 9.5, color: T.mu, marginTop: 6, lineHeight: 1.5 }}>
              🔒 Stocké dans un espace privé chiffré. Jamais visible par les structures ni les autres utilisateurs.
            </div>
          </Fld>

          <Fld label="Nom complet (tel qu'il figure sur la pièce)">
            <input aria-label="Nom complet KYC" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" style={inp} />
          </Fld>

          <Fld label="IBAN à ton nom">
            <input aria-label="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 3000 1007 1234 5678 9012 345" style={inp} />
            {iban.length > 0 && !isPlausibleIban(iban) && (
              <div style={{ fontSize: 10, color: T.amber, marginTop: 5 }}>Format d'IBAN inattendu — vérifie la saisie.</div>
            )}
          </Fld>

          {error && <div style={{ fontSize: 11, color: T.red, marginBottom: 10 }}>{error}</div>}

          <button
            onClick={submit}
            disabled={!ready || busy}
            style={{ width: '100%', background: ready && !busy ? '#fff' : T.row, color: ready && !busy ? '#000' : T.mu, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: ready && !busy ? 'pointer' : 'not-allowed', marginTop: 4 }}
          >
            {busy ? 'Envoi…' : ready ? 'Envoyer pour vérification' : 'Complète pièce, nom et IBAN'}
          </button>
          <div style={{ fontSize: 9.5, color: T.mu, textAlign: 'center', marginTop: 9, lineHeight: 1.5 }}>
            Après envoi, ton dossier passe en « Vérification en cours ». Tu peux continuer à postuler ; seuls les paiements attendent la validation.
          </div>
        </div>
      </div>
    </div>
  );
}
