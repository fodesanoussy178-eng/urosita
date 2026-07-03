import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { signOut } from '@/features/auth/authService';
import { updateProfile } from '@/features/profile/profileService';
import { T, FONT } from '@/components/ui/theme';
import { QRBadge } from '@/components/ui/QRBadge';
import { Stars } from '@/components/ui/Stars';
import { fetchOpenMissions, type MissionWithStructure } from '@/features/missions/missionsService';
import {
  applyToMission,
  completeApplication,
  fetchMyApplications,
  type ApplicationWithMission,
} from '@/features/missions/applicationsService';
import { fetchMyRatings, fetchStructureRatings, rateStructure, type StructureRating } from '@/features/missions/ratingsService';
import { formatEuros, formatHours } from '@/lib/format';

type Tab = 'flux' | 'moi' | 'profil';

const STATUS_LABELS: Record<string, [string, string, string]> = {
  pending: ['En attente', T.amber, T.amberBg],
  accepted: ['Acceptée', T.green, T.greenBg],
  rejected: ['Refusée', T.red, T.redBg],
  cancelled: ['Annulée', T.mu, T.row],
  completed: ['Terminée', T.cyan, '#22d3ee15'],
};

function euros(cents: number): string {
  return formatEuros(cents).replace(' EUR', ' €');
}

export function WorkerApp() {
  const { session, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('flux');
  const [flux, setFlux] = useState<MissionWithStructure[]>([]);
  const [apps, setApps] = useState<ApplicationWithMission[]>([]);
  const [myRatings, setMyRatings] = useState<Map<string, number>>(new Map());
  const [structRatings, setStructRatings] = useState<Map<string, StructureRating>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MissionWithStructure | null>(null);
  const [ratingFor, setRatingFor] = useState<ApplicationWithMission | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout>>();

  const ville = (session?.user.user_metadata?.city as string | undefined) || '';
  const prenom = (profile?.full_name || session?.user.email || '').split(' ')[0] || '';

  function notif(m: string) {
    setToast(m);
    clearTimeout(tr.current);
    tr.current = setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    if (!session) return;
    try {
      const [missions, myApps, ratings] = await Promise.all([
        fetchOpenMissions(),
        fetchMyApplications(session.user.id),
        fetchMyRatings(session.user.id),
      ]);
      setFlux(missions);
      setApps(myApps);
      setMyRatings(ratings);
      const structureIds = [...new Set(missions.map((m) => m.structure_id))];
      setStructRatings(await fetchStructureRatings(structureIds));
    } catch {
      notif('Impossible de charger les missions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const appliedIds = new Set(apps.map((a) => a.mission_id));
  const completedApps = apps.filter((a) => a.status === 'completed');
  const activeApps = apps.filter((a) => a.status !== 'completed');
  const cvCount = completedApps.length;

  async function accept(m: MissionWithStructure) {
    if (!session || appliedIds.has(m.id) || busyId) return;
    setBusyId(m.id);
    try {
      await applyToMission(m.id, session.user.id);
      await load();
      setDetail(null);
      notif('✓ Candidature envoyée — retrouve-la dans Missions.');
    } catch (e) {
      notif(e instanceof Error ? e.message : 'Impossible de postuler.');
    } finally {
      setBusyId(null);
    }
  }

  async function terminer(a: ApplicationWithMission) {
    if (busyId) return;
    setBusyId(a.id);
    try {
      await completeApplication(a.id);
      await load();
      setRatingFor(a);
    } catch (e) {
      notif(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  }

  async function rate(score: number) {
    if (!session || !ratingFor?.mission) return;
    try {
      await rateStructure({
        applicationId: ratingFor.id,
        structureId: ratingFor.mission.structure_id,
        workerId: session.user.id,
        score,
      });
      await load();
      notif('Mission ajoutée à ton CV vivant ✓');
    } catch (e) {
      notif(e instanceof Error ? e.message : 'Notation impossible.');
    } finally {
      setRatingFor(null);
    }
  }

  const S = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 } as const;
  const SH = { width: '100%', maxWidth: 430, background: T.card, borderRadius: '20px 20px 0 0', padding: '18px 16px 28px' } as const;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ width: '100%', maxWidth: 430, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ padding: '22px 16px 12px', borderBottom: `1px solid ${T.cb}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 14 }}>U</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.cyan, background: '#22d3ee15', borderRadius: 20, padding: '3px 8px' }}>
              {cvCount} mission{cvCount > 1 ? 's' : ''} au CV
            </span>
          </div>
          <span style={{ fontSize: 11, color: T.mu, fontWeight: 700 }}>{prenom}</span>
        </div>

        {toast && <div style={{ margin: '8px 12px 0', background: T.card, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '7px 11px', fontSize: 11, color: T.sub }}>{toast}</div>}

        <div style={{ padding: '10px 12px', flex: 1 }}>
          {/* ── FLUX ── */}
          {tab === 'flux' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {loading && <div style={{ fontSize: 11, color: T.mu, textAlign: 'center', padding: 20 }}>Chargement…</div>}
              {!loading && flux.length === 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: '24px 16px', textAlign: 'center', fontSize: 11, color: T.sub, lineHeight: 1.6 }}>
                  Aucune mission ouverte pour l'instant.
                  <br />
                  Elles apparaîtront ici dès qu'une structure en publie.
                </div>
              )}
              {flux.map((m) => {
                const isA = appliedIds.has(m.id);
                const sr = structRatings.get(m.structure_id);
                return (
                  <div key={m.id} onClick={() => setDetail(m)} style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, cursor: 'pointer', overflow: 'hidden' }}>
                    <div style={{ padding: '15px 15px 12px' }}>
                      <div style={{ fontSize: 33, fontWeight: 900, color: T.text, letterSpacing: -2, lineHeight: 1, marginBottom: 6 }}>{euros(m.worker_rate_cents)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 5 }}>{m.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{m.structure?.name ?? 'Structure'}</span>
                        {m.structure?.siret && <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 5px' }}>✓ SIRET</span>}
                        {sr ? (
                          <>
                            <Stars n={sr.average} size={11} />
                            <span style={{ fontSize: 10, color: T.mu }}>
                              {sr.average.toFixed(1).replace('.', ',')} · {sr.count} avis
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 8, fontWeight: 700, color: T.cyan, background: '#22d3ee15', borderRadius: 8, padding: '1px 6px' }}>Nouvelle</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: T.mu }}>
                        📍 {m.city || 'MEL'} · {m.scheduled_date} · {formatHours(m.duration_minutes)}
                      </div>
                    </div>
                    <div style={{ padding: '0 15px 13px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          accept(m);
                        }}
                        disabled={isA || busyId === m.id}
                        style={{ width: '100%', background: isA ? T.greenBg : '#fff', color: isA ? T.green : '#000', border: 'none', borderRadius: 9, padding: '10px 0', fontSize: 13, fontWeight: 900, cursor: isA ? 'default' : 'pointer' }}
                      >
                        {isA ? '✓ Candidature envoyée' : busyId === m.id ? '…' : 'Accepter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MES MISSIONS + CV ── */}
          {tab === 'moi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeApps.length === 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: T.sub, marginBottom: 12 }}>Aucune candidature en cours</div>
                  <button onClick={() => setTab('flux')} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    Voir le flux →
                  </button>
                </div>
              )}
              {activeApps.map((a) => {
                const entry = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending!;
                const [label, color, bg] = entry;
                const isAccepted = a.status === 'accepted';
                return (
                  <div key={a.id} style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 2 }}>{a.mission?.title ?? 'Mission'}</div>
                        <div style={{ fontSize: 10, color: T.mu }}>
                          {a.mission?.city ? `📍 ${a.mission.city} · ` : ''}
                          {a.mission?.scheduled_date ?? ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color, background: bg, borderRadius: 8, padding: '2px 8px', flexShrink: 0, marginLeft: 8 }}>{label}</span>
                    </div>

                    {isAccepted && (
                      <>
                        <div style={{ background: '#fff', borderRadius: 11, padding: '14px 0 9px', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0 10px' }}>
                          <QRBadge value={`${window.location.origin}/pointage/${a.id}/${a.checkin_token}`} />
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontWeight: 600 }}>
                            {a.checked_in_at ? '✓ Présence validée' : 'À faire scanner par la structure sur place'}
                          </div>
                        </div>
                        {a.checked_in_at && (
                          <div style={{ fontSize: 10, color: T.green, fontWeight: 700, marginBottom: 8 }}>
                            ✓ Présence validée le {new Date(a.checked_in_at).toLocaleString('fr')}
                          </div>
                        )}
                        <button
                          onClick={() => terminer(a)}
                          disabled={busyId === a.id}
                          style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
                        >
                          {busyId === a.id ? '…' : '▦ Terminer la mission'}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* CV VIVANT */}
              <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 15 }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 13 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#f97316,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 17 }}>
                    {(prenom || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{profile?.full_name || session?.user.email}</div>
                    <div style={{ fontSize: 10, color: T.mu }}>{ville ? `${ville} · ` : ''}CV vivant</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 13 }}>
                  {[
                    ['Missions prouvées', String(cvCount)],
                    ['Candidatures', String(apps.length)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: T.row, borderRadius: 9, padding: '11px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{v}</div>
                      <div style={{ fontSize: 9, color: T.mu, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Historique vérifié</div>
                {completedApps.length === 0 && (
                  <div style={{ fontSize: 11, color: T.mu }}>Tes missions terminées apparaîtront ici, comme preuves vérifiées.</div>
                )}
                {completedApps.map((a, i) => {
                  const score = myRatings.get(a.id);
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? `1px solid ${T.cb}` : 'none' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.mission?.title ?? 'Mission'}</div>
                        <div style={{ fontSize: 9, color: T.mu }}>
                          {a.mission?.scheduled_date ?? ''}
                          {a.checked_in_at ? ' · présence validée' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {score ? <Stars n={score} size={10} /> : null}
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.green }}>✓</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PROFIL ── */}
          {tab === 'profil' && (
            <ProfilTab
              fullName={profile?.full_name || ''}
              ville={ville}
              isMicro={profile?.is_micro_entrepreneur ?? false}
              onSave={async (name, micro) => {
                if (!session) return;
                await updateProfile(session.user.id, { full_name: name, is_micro_entrepreneur: micro });
                await refreshProfile();
                notif('Profil mis à jour ✓');
              }}
            />
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ borderTop: `1px solid ${T.cb}`, padding: '6px 10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, position: 'sticky', bottom: 0, background: T.bg }}>
          {(
            [
              ['flux', '🗂', 'Flux'],
              ['moi', '👤', 'Missions'],
              ['profil', '⚙️', 'Profil'],
            ] as [Tab, string, string][]
          ).map(([k, ic, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#000' : T.mu, position: 'relative' }}>
              <span style={{ fontSize: 14 }}>{ic}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{l}</span>
              {k === 'moi' && apps.some((a) => a.status === 'accepted') && <span style={{ position: 'absolute', top: 4, right: 14, width: 6, height: 6, borderRadius: '50%', background: T.cyan }} />}
            </button>
          ))}
        </div>

        {/* Détail mission */}
        {detail && (
          <div style={S} onClick={() => setDetail(null)}>
            <div style={{ ...SH, maxHeight: '76vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <button onClick={() => setDetail(null)} style={{ background: T.row, border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', color: T.sub, fontSize: 13 }}>×</button>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: T.text, letterSpacing: -2, marginBottom: 4 }}>{euros(detail.worker_rate_cents)}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 10 }}>{detail.title}</div>
              <div style={{ background: T.row, borderRadius: 11, padding: '12px 13px', marginBottom: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{detail.structure?.name ?? 'Structure'}</span>
                  {detail.structure?.siret && <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 5px' }}>✓ SIRET</span>}
                </div>
                <div style={{ fontSize: 11, color: T.sub }}>
                  📍 {detail.city || 'MEL'} · {detail.scheduled_date} · {formatHours(detail.duration_minutes)}
                </div>
              </div>
              {detail.detail && <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.55, marginBottom: 13 }}>{detail.detail}</div>}
              <button
                onClick={() => accept(detail)}
                disabled={appliedIds.has(detail.id)}
                style={{ width: '100%', background: appliedIds.has(detail.id) ? T.greenBg : '#fff', color: appliedIds.has(detail.id) ? T.green : '#000', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}
              >
                {appliedIds.has(detail.id) ? '✓ Candidature envoyée' : `Accepter — ${euros(detail.worker_rate_cents)}`}
              </button>
            </div>
          </div>
        )}

        {/* Recap + étoiles */}
        {ratingFor && (
          <div style={{ ...S, background: 'rgba(0,0,0,.92)' }}>
            <div style={SH} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: T.green }}>Mission terminée !</div>
                  <div style={{ fontSize: 10, color: T.mu }}>{ratingFor.mission?.title}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>Cette mission rejoint ton CV vivant comme preuve vérifiée.</div>
              <div style={{ fontSize: 12, color: T.text, fontWeight: 700, marginBottom: 9 }}>Note la structure :</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => rate(n)} style={{ flex: 1, padding: '12px 0', fontSize: 22, background: T.row, border: `1px solid ${T.cb}`, borderRadius: 10, cursor: 'pointer', color: '#f59e0b' }}>
                    ★
                  </button>
                ))}
              </div>
              <button onClick={() => setRatingFor(null)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.mu, padding: '4px 0' }}>
                Passer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilTab({ fullName, ville, isMicro, onSave }: { fullName: string; ville: string; isMicro: boolean; onSave: (name: string, micro: boolean) => Promise<void> }) {
  const [name, setName] = useState(fullName);
  const [micro, setMicro] = useState(isMicro);
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 15 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Nom complet</div>
        <input aria-label="Nom complet" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', background: T.row, border: `1px solid ${T.cb}`, borderRadius: 9, padding: '12px 13px', fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        {ville && <div style={{ fontSize: 11, color: T.mu, marginBottom: 12 }}>📍 {ville}</div>}
        <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Statut</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setMicro(false)} style={{ background: !micro ? '#fff' : T.row, color: !micro ? '#000' : T.sub, border: `1px solid ${!micro ? '#fff' : T.cb}`, borderRadius: 9, padding: '10px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            Particulier
          </button>
          <button onClick={() => setMicro(true)} style={{ background: micro ? '#fff' : T.row, color: micro ? '#000' : T.sub, border: `1px solid ${micro ? '#fff' : T.cb}`, borderRadius: 9, padding: '10px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            Micro-entrepreneur
          </button>
        </div>
        <div style={{ fontSize: 9.5, color: T.mu, lineHeight: 1.5, marginBottom: 12 }}>
          Si tu n'es pas micro-entrepreneur, le plafond légal de 3 jours consécutifs chez la même structure s'applique automatiquement.
        </div>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(name, micro);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          style={{ width: '100%', background: busy ? T.row : '#fff', color: busy ? T.mu : '#000', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
        >
          {busy ? '…' : 'Enregistrer'}
        </button>
      </div>
      <button onClick={() => signOut()} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', fontSize: 11, color: T.sub, fontWeight: 600 }}>
        Se déconnecter
      </button>
    </div>
  );
}
