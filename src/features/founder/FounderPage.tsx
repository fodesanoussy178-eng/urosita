import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONT, inp } from '@/components/ui/theme';
import { kycMode } from '@/lib/env';
import { KYC_STATUS_LABELS, KYC_DOCUMENT_LABELS } from '@/features/kyc/kycService';
import { StatusPill } from '@/features/kyc/VerifiedBadge';
import type { KycDocumentType } from '@/types/database.types';
import {
  founderListVerifications,
  founderVerificationHistory,
  founderSetStatus,
  type FounderVerification,
  type FounderHistoryEntry,
  type FounderDecision,
} from '@/features/kyc/founderService';

const STORAGE_KEY = 'urosi.founder.passcode';

type Filter = 'waiting' | 'verified' | 'rejected';

const HISTORY_SOURCE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  simulation: 'Fondateur (simulation)',
  lemonway_webhook: 'Lemonway',
  system: 'Système',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function FounderPage() {
  const nav = useNavigate();
  const [passcode, setPasscode] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));

  if (!passcode) {
    return <PasscodeGate onUnlock={(code) => { sessionStorage.setItem(STORAGE_KEY, code); setPasscode(code); }} onBack={() => nav('/')} />;
  }
  return <Dashboard passcode={passcode} onLock={() => { sessionStorage.removeItem(STORAGE_KEY); setPasscode(null); nav('/'); }} />;
}

function PasscodeGate({ onUnlock, onBack }: { onUnlock: (code: string) => void; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      // Le code est valide cote serveur : si l'appel reussit, il est correct.
      await founderListVerifications(code.trim());
      onUnlock(code.trim());
    } catch {
      setError('Code invalide.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: 16 }}>
      <div style={{ width: 300 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 4 }}>Accès fondateur</div>
        <div style={{ fontSize: 11, color: T.mu, marginBottom: 18 }}>Espace réservé. Saisis le code d'accès.</div>
        <input
          aria-label="Code d'accès fondateur"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Code d'accès"
          style={inp}
          autoFocus
        />
        {error && <div style={{ fontSize: 11, color: T.red, marginTop: 8 }}>{error}</div>}
        <button
          onClick={submit}
          disabled={busy}
          style={{ width: '100%', background: '#fff', color: '#000', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginTop: 12 }}
        >
          {busy ? '…' : 'Entrer'}
        </button>
        <button onClick={onBack} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.sub, marginTop: 14, fontWeight: 700 }}>
          ← Retour
        </button>
      </div>
    </div>
  );
}

function Dashboard({ passcode, onLock }: { passcode: string; onLock: () => void }) {
  const [rows, setRows] = useState<FounderVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('waiting');
  const [selected, setSelected] = useState<FounderVerification | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await founderListVerifications(passcode));
    } catch {
      setToast('Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waiting = rows.filter((r) => r.status === 'pending' || r.status === 'info_required');
  const verified = rows.filter((r) => r.status === 'verified');
  const rejected = rows.filter((r) => r.status === 'rejected');
  const shown = filter === 'waiting' ? waiting : filter === 'verified' ? verified : rejected;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', justifyContent: 'center', fontFamily: FONT, padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 15 }}>U</div>
            <span style={{ fontWeight: 900, fontSize: 15, color: T.text }}>Tableau de bord fondateur</span>
          </div>
          <button onClick={onLock} style={{ fontSize: 10, color: T.mu, background: 'none', border: `1px solid ${T.cb}`, borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>Quitter</button>
        </div>
        <div style={{ fontSize: 11, color: T.mu, marginBottom: 16 }}>
          Vérifications KYC ·{' '}
          {kycMode === 'simulation'
            ? <span style={{ color: T.amber, fontWeight: 700 }}>mode simulation</span>
            : <span style={{ color: T.cyan, fontWeight: 700 }}>piloté par Lemonway</span>}
        </div>

        {toast && <div style={{ marginBottom: 10, background: T.card, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '7px 11px', fontSize: 11, color: T.sub }}>{toast}</div>}

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(
            [
              ['waiting', 'En attente', waiting.length],
              ['verified', 'Vérifiés', verified.length],
              ['rejected', 'Refusés', rejected.length],
            ] as [Filter, string, number][]
          ).map(([k, l, n]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{ flex: 1, background: filter === k ? '#fff' : T.card, color: filter === k ? '#000' : T.sub, border: `1px solid ${filter === k ? '#fff' : T.cb}`, borderRadius: 9, padding: '8px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              {l}
              {n > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, color: filter === k ? '#000' : T.cyan }}>{n}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ fontSize: 11, color: T.mu, textAlign: 'center', padding: 20 }}>Chargement…</div>
        ) : shown.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: 20, textAlign: 'center', fontSize: 11, color: T.mu }}>Aucun dossier dans cette catégorie.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                style={{ textAlign: 'left', background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name || 'Utilisateur'}</span>
                  <StatusPill status={r.status} />
                </div>
                <div style={{ fontSize: 10, color: T.mu, lineHeight: 1.6 }}>
                  {r.document_type ? KYC_DOCUMENT_LABELS[r.document_type as KycDocumentType] : 'Pièce non fournie'}
                  {r.iban_masked ? ` · IBAN ${r.iban_masked}` : ''}
                  <br />
                  Documents envoyés : {fmtDate(r.submitted_at)}
                  {r.status === 'info_required' && r.missing_info ? <><br /><span style={{ color: T.amber }}>À compléter : {r.missing_info}</span></> : null}
                  {r.status === 'rejected' && r.rejection_reason ? <><br /><span style={{ color: T.red }}>Motif : {r.rejection_reason}</span></> : null}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <DetailSheet
            passcode={passcode}
            verif={selected}
            onClose={() => setSelected(null)}
            onChanged={(m) => {
              setToast(m);
              setSelected(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function DetailSheet({
  passcode,
  verif,
  onClose,
  onChanged,
}: {
  passcode: string;
  verif: FounderVerification;
  onClose: () => void;
  onChanged: (toast: string) => void;
}) {
  const [history, setHistory] = useState<FounderHistoryEntry[] | null>(null);
  const [action, setAction] = useState<FounderDecision | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    founderVerificationHistory(passcode, verif.id).then(setHistory).catch(() => setHistory([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verif.id]);

  const needsReason = action === 'rejected' || action === 'info_required';

  async function apply(decision: FounderDecision) {
    if (busy) return;
    // Refus / demande de document : une raison est requise.
    if ((decision === 'rejected' || decision === 'info_required') && !reason.trim()) {
      setAction(decision);
      setError('Précise un motif / le document manquant.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await founderSetStatus(passcode, verif.id, decision, reason.trim() || undefined);
      onChanged(
        decision === 'verified' ? 'Compte validé.' : decision === 'rejected' ? 'Dossier refusé.' : 'Document demandé.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 460, background: T.card, borderRadius: '20px 20px 0 0', padding: '18px 16px 26px', fontFamily: FONT, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: T.text }}>{verif.full_name || 'Utilisateur'}</div>
            <div style={{ marginTop: 4 }}><StatusPill status={verif.status} /></div>
          </div>
          <button onClick={onClose} style={{ background: T.row, border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: T.sub, fontSize: 14 }}>×</button>
        </div>

        <div style={{ background: T.row, borderRadius: 10, padding: '12px 13px', marginBottom: 14, fontSize: 11, color: T.sub, lineHeight: 1.7 }}>
          <div>Pièce : <span style={{ color: T.text }}>{verif.document_type ? KYC_DOCUMENT_LABELS[verif.document_type as KycDocumentType] : '—'}</span></div>
          <div>IBAN : <span style={{ color: T.text }}>{verif.iban_masked || '—'}</span></div>
          <div>Documents envoyés : <span style={{ color: T.text }}>{fmtDate(verif.submitted_at)}</span></div>
          <div>Dernière décision : <span style={{ color: T.text }}>{fmtDate(verif.reviewed_at)}</span></div>
        </div>

        {kycMode === 'simulation' ? (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Actions (simulation)</div>
            {needsReason && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={action === 'rejected' ? 'Motif du refus…' : 'Document / information à fournir…'}
                style={{ ...inp, resize: 'none', lineHeight: 1.5, marginBottom: 8 }}
              />
            )}
            {error && <div style={{ fontSize: 11, color: T.red, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <button onClick={() => apply('verified')} disabled={busy} style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}`, borderRadius: 8, padding: '11px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>✓ Valider</button>
              <button onClick={() => apply('rejected')} disabled={busy} style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '11px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Refuser</button>
            </div>
            <button onClick={() => apply('info_required')} disabled={busy} style={{ width: '100%', background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}`, borderRadius: 8, padding: '11px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginBottom: 16 }}>↺ Demander un nouveau document</button>
          </>
        ) : (
          <div style={{ background: T.row, borderRadius: 10, padding: '11px 13px', marginBottom: 16, fontSize: 10.5, color: T.cyan, lineHeight: 1.55 }}>
            Statuts pilotés par les webhooks Lemonway. Les actions manuelles sont désactivées en mode production.
          </div>
        )}

        <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Historique des statuts</div>
        {history === null ? (
          <div style={{ fontSize: 11, color: T.mu }}>Chargement…</div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 11, color: T.mu }}>Aucun changement enregistré.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: 9, padding: '9px 0', borderTop: i > 0 ? `1px solid ${T.cb}` : 'none' }}>
                <div style={{ fontSize: 10, color: T.mu, minWidth: 88, flexShrink: 0 }}>{fmtDate(h.created_at)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: T.text }}>
                    {h.from_status ? `${KYC_STATUS_LABELS[h.from_status as keyof typeof KYC_STATUS_LABELS] ?? h.from_status} → ` : ''}
                    <span style={{ fontWeight: 800 }}>{KYC_STATUS_LABELS[h.to_status as keyof typeof KYC_STATUS_LABELS] ?? h.to_status}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: T.mu }}>
                    {HISTORY_SOURCE_LABELS[h.source] ?? h.source}
                    {h.reason ? ` · ${h.reason}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
