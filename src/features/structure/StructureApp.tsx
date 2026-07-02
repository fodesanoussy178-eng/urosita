import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { signOut } from '@/features/auth/authService';
import { T, FONT, inp } from '@/components/ui/theme';
import { Fld } from '@/components/ui/Fld';
import { fetchMyStructures, createStructure } from './structureService';
import { fetchMissionsForStructure, createMission } from '@/features/missions/missionsService';
import {
  fetchApplicationsForMission,
  updateApplicationStatus,
  type ApplicationWithApplicant,
} from '@/features/missions/applicationsService';
import type { Mission, Structure } from '@/features/missions/types';
import { formatEuros, formatHours } from '@/lib/format';

type Tab = 'missions' | 'candidats';

const DAY_OFFSETS = [0, 1, 2];
const DUREES = [2, 3, 4, 5];

function dayLabel(o: number): string {
  if (o === 0) return "Aujourd'hui";
  if (o === 1) return 'Demain';
  if (o === 2) return 'Après-demain';
  const d = new Date();
  d.setDate(d.getDate() + o);
  return d.toLocaleDateString('fr', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function dayToDate(o: number): string {
  const d = new Date();
  d.setDate(d.getDate() + o);
  return d.toISOString().slice(0, 10);
}

export function StructureApp() {
  const { session } = useAuth();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('missions');
  const [mis, setMis] = useState<Mission[]>([]);
  const [cands, setCands] = useState<Map<string, ApplicationWithApplicant[]>>(new Map());
  const [candMis, setCandMis] = useState<string | null>(null);
  const [showPub, setShowPub] = useState(false);
  const [vf, setVf] = useState({ nom: '', siret: '' });
  const [toast, setToast] = useState<string | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout>>();

  function notif(m: string) {
    setToast(m);
    clearTimeout(tr.current);
    tr.current = setTimeout(() => setToast(null), 3000);
  }

  async function loadCands(missions: Mission[]) {
    const entries = await Promise.all(
      missions.map(async (m) => [m.id, await fetchApplicationsForMission(m.id)] as const),
    );
    setCands(new Map(entries));
  }

  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        let mine = await fetchMyStructures(session.user.id);
        if (mine.length === 0) {
          // L'inscription structure passe nom + SIRET en metadonnees : on cree
          // la fiche structure automatiquement au premier passage.
          const meta = session.user.user_metadata as Record<string, string | null>;
          if (meta.structure_name) {
            const created = await createStructure(session.user.id, meta.structure_name, meta.siret ?? undefined);
            mine = [created];
          }
        }
        const st = mine[0] ?? null;
        setStructure(st);
        if (st) {
          const missions = await fetchMissionsForStructure(st.id);
          setMis(missions);
          await loadCands(missions);
        }
      } catch {
        notif('Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function createFromForm() {
    if (!session) return;
    const okv = vf.nom.trim().length >= 2 && vf.siret.replace(/\s/g, '').length >= 9;
    if (!okv) return;
    try {
      const created = await createStructure(session.user.id, vf.nom.trim(), vf.siret.trim());
      setStructure(created);
      notif('✓ Structure enregistrée.');
    } catch (e) {
      notif(e instanceof Error ? e.message : 'Création impossible.');
    }
  }

  async function decide(applicationId: string, dec: 'accepted' | 'rejected') {
    try {
      await updateApplicationStatus(applicationId, dec);
      await loadCands(mis);
      notif(dec === 'accepted' ? 'Candidat accepté.' : 'Candidat refusé.');
    } catch (e) {
      notif(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  const allCands = mis.flatMap((m) => (cands.get(m.id) ?? []).map((c) => ({ ...c, missionTitle: m.title })));
  const pending = allCands.filter((c) => c.status === 'pending');
  const shownCands = candMis ? allCands.filter((c) => c.mission_id === candMis) : allCands;
  const misTitle = (mid: string) => mis.find((m) => m.id === mid)?.title ?? '—';
  const candCount = (mid: string) => (cands.get(mid) ?? []).filter((c) => c.status === 'pending').length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: T.mu, fontSize: 12 }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', justifyContent: 'center', fontFamily: FONT, padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 15 }}>U</div>
            <span style={{ fontWeight: 900, fontSize: 15, color: T.text }}>Espace structure</span>
          </div>
          <button onClick={() => signOut()} style={{ fontSize: 10, color: T.mu, background: 'none', border: `1px solid ${T.cb}`, borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>

        {toast && <div style={{ marginBottom: 10, background: T.card, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '7px 11px', fontSize: 11, color: T.sub }}>{toast}</div>}

        {!structure ? (
          <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 17 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>Avant de publier, on identifie ta structure</div>
            <div style={{ fontSize: 11, color: T.sub, lineHeight: 1.5, marginBottom: 16 }}>
              Seules les structures identifiées (SIRET) peuvent publier des missions.
            </div>
            <Fld label="Nom de la structure">
              <input aria-label="Nom de la structure" value={vf.nom} onChange={(e) => setVf((x) => ({ ...x, nom: e.target.value }))} placeholder="Burger Nord" style={inp} />
            </Fld>
            <Fld label="SIRET">
              <input aria-label="SIRET" value={vf.siret} onChange={(e) => setVf((x) => ({ ...x, siret: e.target.value }))} placeholder="123 456 789 00012" style={inp} />
            </Fld>
            <button
              onClick={createFromForm}
              style={{ width: '100%', background: '#fff', color: '#000', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 4 }}
            >
              Enregistrer ma structure
            </button>
          </div>
        ) : (
          <>
            {/* Bandeau structure */}
            <div style={{ background: T.card, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: '12px 15px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'hsl(200 58% 46%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {structure.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{structure.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {structure.siret && <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 6px' }}>✓ SIRET {structure.siret}</span>}
                </div>
              </div>
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(
                [
                  ['missions', 'Missions', mis.length],
                  ['candidats', 'Candidats', pending.length],
                ] as [Tab, string, number][]
              ).map(([k, l, n]) => (
                <button
                  key={k}
                  onClick={() => {
                    setTab(k);
                    if (k === 'candidats') setCandMis(null);
                  }}
                  style={{ flex: 1, background: tab === k ? '#fff' : T.card, color: tab === k ? '#000' : T.sub, border: `1px solid ${tab === k ? '#fff' : T.cb}`, borderRadius: 9, padding: '8px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  {l}
                  {n > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, color: tab === k ? '#000' : T.cyan }}>{n}</span>}
                </button>
              ))}
            </div>

            {/* ── MISSIONS ── */}
            {tab === 'missions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setShowPub(true)} style={{ width: '100%', background: T.grad, color: '#fff', border: 'none', borderRadius: 11, padding: '12px 0', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginBottom: 2 }}>
                  ＋ Publier une mission
                </button>
                {mis.length === 0 && (
                  <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: 20, textAlign: 'center', fontSize: 11, color: T.mu }}>
                    Aucune mission publiée pour l'instant.
                  </div>
                )}
                {mis.map((m, i) => {
                  const cc = candCount(m.id);
                  return (
                    <div key={m.id}>
                      {i === 0 && <div style={{ fontSize: 9, fontWeight: 800, color: T.cyan, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 }}>★ Dernière mission publiée</div>}
                      <div style={{ background: T.card, border: `1px solid ${i === 0 ? '#0e7490' : T.cb}`, borderRadius: 12, padding: '13px 15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>{m.title}</div>
                            <div style={{ fontSize: 10, color: T.mu }}>
                              📍 {m.city || 'MEL'} · {m.scheduled_date} · {formatHours(m.duration_minutes)}
                            </div>
                            {m.detail && <div style={{ fontSize: 10, color: T.sub, marginTop: 4, lineHeight: 1.45 }}>{m.detail}</div>}
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 900, color: T.text, flexShrink: 0, marginLeft: 10 }}>{formatEuros(m.worker_rate_cents).replace(' EUR', ' €')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: m.status === 'open' ? T.green : T.mu, background: m.status === 'open' ? T.greenBg : T.row, borderRadius: 8, padding: '2px 8px' }}>
                            {m.status === 'open' ? 'Active' : m.status === 'closed' ? 'Clôturée' : 'Annulée'}
                          </span>
                          {cc > 0 ? (
                            <button
                              onClick={() => {
                                setCandMis(m.id);
                                setTab('candidats');
                              }}
                              style={{ fontSize: 10, fontWeight: 700, color: T.cyan, background: '#22d3ee15', border: 'none', borderRadius: 8, padding: '3px 9px', cursor: 'pointer' }}
                            >
                              {cc} candidat{cc > 1 ? 's' : ''} →
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: T.mu }}>Aucun candidat pour l'instant</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CANDIDATS ── */}
            {tab === 'candidats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {candMis ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#22d3ee12', border: '1px solid #0e7490', borderRadius: 10, padding: '9px 12px' }}>
                    <span style={{ fontSize: 11, color: T.cyan, fontWeight: 800 }}>Candidats pour « {misTitle(candMis)} »</span>
                    <button onClick={() => setCandMis(null)} style={{ fontSize: 10, color: T.sub, background: T.row, border: `1px solid ${T.cb}`, borderRadius: 7, padding: '3px 9px', fontWeight: 700, cursor: 'pointer' }}>
                      Tous ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: T.sub, lineHeight: 1.5, marginBottom: 2 }}>
                    Les travailleurs qui ont postulé à tes missions. Confirme ou refuse chaque candidature.
                  </div>
                )}
                {shownCands.map((c) => (
                  <div key={c.id} style={{ background: T.card, border: `1px solid ${c.status === 'accepted' ? T.greenBorder : c.status === 'rejected' ? T.redBorder : T.cb}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', display: 'flex', gap: 11, alignItems: 'center' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'hsl(24 58% 46%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                        {(c.profile?.full_name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>{c.profile?.full_name || 'Candidat'}</div>
                        <div style={{ fontSize: 10, color: T.mu, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{misTitle(c.mission_id)}</div>
                      </div>
                      {c.status !== 'pending' && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: c.status === 'accepted' ? T.green : T.red, flexShrink: 0 }}>
                          {c.status === 'accepted' ? 'accepté' : c.status === 'rejected' ? 'refusé' : c.status}
                        </span>
                      )}
                    </div>
                    {c.status === 'pending' && (
                      <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button onClick={() => decide(c.id, 'accepted')} style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}`, borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                          ✓ Accepter
                        </button>
                        <button onClick={() => decide(c.id, 'rejected')} style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {shownCands.length === 0 && (
                  <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: 20, textAlign: 'center', fontSize: 11, color: T.mu }}>
                    {candMis ? "Personne n'a encore postulé à cette mission." : "Aucun candidat pour l'instant."}
                  </div>
                )}
              </div>
            )}

            {/* Publier (modal) */}
            {showPub && structure && (
              <PublishModal
                structureId={structure.id}
                onClose={() => setShowPub(false)}
                onPublished={(m) => {
                  setMis((l) => [m, ...l]);
                  setShowPub(false);
                  setTab('missions');
                  notif(`« ${m.title} » publiée.`);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PublishModal({ structureId, onClose, onPublished }: { structureId: string; onClose: () => void; onPublished: (m: Mission) => void }) {
  const [f, setF] = useState({ t: '', adr: '', jour: 0, duree: 4, pay: 42, desc: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ok = f.t.trim().length >= 2 && f.adr.trim().length >= 2 && f.pay > 0;

  async function publish() {
    if (!ok || busy) return;
    setError(null);
    setBusy(true);
    try {
      const mission = await createMission({
        structure_id: structureId,
        title: f.t.trim(),
        detail: f.desc.trim() || null,
        city: f.adr.trim(),
        scheduled_date: dayToDate(f.jour),
        duration_minutes: f.duree * 60,
        worker_rate_cents: Math.round(f.pay * 100),
      });
      onPublished(mission);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publication impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 400 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 420, background: T.card, borderRadius: '20px 20px 0 0', padding: '18px 16px 26px', fontFamily: FONT, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: T.text }}>Nouvelle mission</span>
          <button onClick={onClose} style={{ background: T.row, border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: T.sub, fontSize: 14 }}>×</button>
        </div>
        <Fld label="Intitulé de la mission">
          <input aria-label="Intitulé" value={f.t} onChange={(e) => setF((x) => ({ ...x, t: e.target.value }))} placeholder="Renfort service midi" style={inp} autoFocus />
        </Fld>
        <Fld label="Adresse / ville">
          <input aria-label="Adresse" value={f.adr} onChange={(e) => setF((x) => ({ ...x, adr: e.target.value }))} placeholder="12 Rue de Béthune, Lille" style={inp} />
        </Fld>
        <Fld label="Jour">
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DAY_OFFSETS.map((o) => (
              <button key={o} onClick={() => setF((x) => ({ ...x, jour: o }))} style={{ background: f.jour === o ? '#fff' : T.row, color: f.jour === o ? '#000' : T.sub, border: `1px solid ${f.jour === o ? '#fff' : T.cb}`, borderRadius: 20, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {dayLabel(o)}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: T.mu, marginTop: 7, lineHeight: 1.5 }}>
            Publication ouverte à 48h à l'avance (flux constant).
          </div>
        </Fld>
        <Fld label="Durée (plafond légal : 5h)">
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DUREES.map((h) => (
              <button key={h} onClick={() => setF((x) => ({ ...x, duree: h }))} style={{ background: f.duree === h ? '#fff' : T.row, color: f.duree === h ? '#000' : T.sub, border: `1px solid ${f.duree === h ? '#fff' : T.cb}`, borderRadius: 20, padding: '5px 13px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {h}h
              </button>
            ))}
          </div>
        </Fld>
        <Fld label="Descriptif de la mission">
          <textarea
            aria-label="Descriptif"
            value={f.desc}
            onChange={(e) => setF((x) => ({ ...x, desc: e.target.value }))}
            rows={3}
            placeholder="Ce que le travailleur fera concrètement : rush du midi, aide au comptoir…"
            style={{ ...inp, resize: 'none', lineHeight: 1.5 }}
          />
        </Fld>
        <Fld label="Rémunération nette (€)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setF((x) => ({ ...x, pay: Math.max(10, x.pay - 5) }))} style={{ width: 34, height: 34, borderRadius: '50%', background: T.row, border: `1px solid ${T.cb}`, color: T.text, fontSize: 18, cursor: 'pointer' }}>
              −
            </button>
            <span style={{ fontSize: 24, fontWeight: 900, color: T.text, minWidth: 70, textAlign: 'center' }}>{f.pay} €</span>
            <button onClick={() => setF((x) => ({ ...x, pay: x.pay + 5 }))} style={{ width: 34, height: 34, borderRadius: '50%', background: T.grad, border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
              +
            </button>
          </div>
        </Fld>
        {error && <div style={{ fontSize: 11, color: T.red, marginBottom: 10 }}>{error}</div>}
        <button onClick={publish} disabled={!ok || busy} style={{ width: '100%', background: ok && !busy ? '#fff' : T.row, color: ok && !busy ? '#000' : T.mu, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: ok && !busy ? 'pointer' : 'not-allowed' }}>
          {busy ? '…' : ok ? `Publier — ${f.pay} €` : "Remplis l'intitulé et l'adresse"}
        </button>
      </div>
    </div>
  );
}
