import { T } from '@/components/ui/theme';
import type { KycStatus } from '@/types/database.types';
import { KYC_STATUS_LABELS } from './kycService';

// Petit badge vert discret "Compte vérifié", affiche sur le profil.
export function VerifiedBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9,
        fontWeight: 700,
        color: T.green,
        background: T.greenBg,
        border: `1px solid ${T.greenBorder}`,
        borderRadius: 20,
        padding: '2px 8px',
        lineHeight: 1.4,
      }}
    >
      ✓ Compte vérifié
    </span>
  );
}

const PILL: Record<KycStatus, { color: string; bg: string; border: string }> = {
  unverified: { color: T.mu, bg: T.row, border: T.cb },
  info_required: { color: T.amber, bg: T.amberBg, border: T.amberBorder },
  pending: { color: T.cyan, bg: '#22d3ee15', border: '#0e7490' },
  verified: { color: T.green, bg: T.greenBg, border: T.greenBorder },
  rejected: { color: T.red, bg: T.redBg, border: T.redBorder },
};

// Pastille de statut generique pour les vues fondateur / profil.
export function StatusPill({ status }: { status: KycStatus }) {
  const s = PILL[status];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 20,
        padding: '2px 8px',
        lineHeight: 1.4,
      }}
    >
      {KYC_STATUS_LABELS[status]}
    </span>
  );
}
