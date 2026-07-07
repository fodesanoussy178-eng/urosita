import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONT, inp } from '@/components/ui/theme';
import { Fld } from '@/components/ui/Fld';
import { Stars } from '@/components/ui/Stars';
import { DemoGate } from './DemoGate';
import { SEED, type DemoCand, type DemoHabitue, type DemoSMission } from './demoData';

// Démo structure : reprise du prototype UROSI T MVP, 100 % locale.
// Les comptes fictifs « Burger Nord » (PME) et « Banque Alimentaire » (asso)
// se chargent en un clic ; l'écran est figé après 30 s par DemoGate.

type STab = 'missions' | 'candidats' | 'habitues';

const STAG: Record<DemoSMission['st'], [string, string, string]> = {
  active: ['Active', '#4ade80', '#052e16'],
  draft: ['Brouillon', '#9ca3af', '#1f2937'],
  pourvue: ['Pourvue', '#60a5fa', '#0c1a2e'],
};

function Av({ l, h, sz = 34 }: { l: string; h: number; sz?: number }) {
  return (
    <div style={{ width: sz, height: sz, borderRadius: Math.round(sz * 0.28), background: `hsl(${h} 58% 46%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: Math.round(sz * 0.4), flexShrink: 0 }}>
      {l}
    </div>
  );
}

const dayLabel = (o: number): string => {
  if (o === 0) return "Aujourd'hui";
  if (o === 1) return 'Demain';
  return 'Après-demain';
};

export function DemoStructurePage() {
  return (
    <DemoGate role="structure">
      <DemoStructureApp />
    </DemoGate>
  );
}

function DemoStructureApp() {
  const nav = useNavigate();
  const [verified, setVerified] = useState(false);
  const [vf, setVf] = useState({ nom: '', siret: '' });
  const [checking, setChecking] = useState(false);
  const [stype, setStype] = useState<{ label: string; ess: boolean } | null>(null);

  const [stab, setStab] = useState<STab>('missions');
  const [candMis, setCandMis] = useState<string | null>(null);
  const [showPub, setShowPub] = useState(false);
  const [panelC, setPanelC] = useState<DemoCand | null>(null);
  const [f, setF] = useState({ t: '', adr: '', pay: 42, jour: "Aujourd'hui", horaire: '', desc: '', solid: false });
  const [mis, setMis] = useState<DemoSMission[]>(SEED.pme.mis);
  const [cands, setCands] = useState<DemoCand[]>(SEED.pme.cands);
  const [habitues, setHab] = useState<DemoHabitue[]>(SEED.pme.habitues);

  const [toast, setToast] = useState<string | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout>>();
  const notif = (m: string) => {
    setToast(m);
    clearTimeout(tr.current);
    tr.current = setTimeout(() => setToast(null), 3000);
  };

  const vOk = vf.nom.trim().length >= 2 && vf.siret.replace(/\s/g, '').length >= 9;
  const verifier = () => {
    if (!vOk || checking) return;
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setVerified(true);
      if (!stype) setStype({ label: 'Entreprise · détecté via SIRET', ess: false });
      notif('✓ Structure vérifiée — registre INSEE.');
    }, 1400);
  };
  const demo = (kind: 'pme' | 'asso') => {
    if (kind === 'pme') {
      setVf({ nom: 'Burger Nord', siret: '852 123 456 00018' });
      setStype({ label: 'PME · Restauration rapide', ess: false });
    } else {
      setVf({ nom: 'Banque Alimentaire du Nord', siret: '421 987 654 00021' });
      setStype({ label: 'Association loi 1901 · ESS', ess: true });
    }
    setMis(SEED[kind].mis);
    setCands(SEED[kind].cands);
    setHab(SEED[kind].habitues);
    setStab('missions');
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setVerified(true);
      notif('✓ Vérifiée — type détecté automatiquement via le SIRET.');
    }, 900);
  };

  const ok = f.t.trim().length >= 2 && f.adr.trim().length >= 2 && (f.solid || f.pay > 0);
  const publish = () => {
    if (!ok) return;
    setMis((l) => [
      { id: 'm' + Date.now(), t: f.t, adr: f.adr, pay: f.solid ? 0 : f.pay, solid: f.solid, dt: [f.jour, f.horaire].filter(Boolean).join(' · ') || 'À planifier', desc: f.desc, st: 'active' },
      ...l,
    ]);
    notif(`« ${f.t} » publiée (démo).`);
    setF({ t: '', adr: '', pay: 42, jour: "Aujourd'hui", horaire: '', desc: '', solid: false });
    setShowPub(false);
    setStab('missions');
  };
  const decide = (id: string, dec: 'accepté' | 'refusé') => {
    setCands((x) => x.map((c) => (c.id === id ? { ...c, dec } : c)));
    setPanelC((p) => (p?.id === id ? { ...p, dec } : p));
    notif(dec === 'accepté' ? 'Candidat accepté.' : 'Candidat refusé.');
  };
  const misTitle = (mid: string) => mis.find((m) => m.id === mid)?.t ?? '—';
  const pending = cands.filter((c) => !c.dec);
  const candCount = (mid: string) => cands.filter((c) => c.mid === mid && !c.dec).length;
  const shown = candMis ? cands.filter((c) => c.mid === candMis) : cands;

  const TABS: [STab, string, number][] = [
    ['missions', 'Missions', mis.length],
    ['candidats', 'Candidats', pending.length],
    ['habitues', 'Habitués', habitues.length],
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', justifyContent: 'center', fontFamily: FONT, padding: '52px 16px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 15 }}>U</div>
            <span style={{ fontWeight: 900, fontSize: 15, color: T.text }}>{verified ? 'Espace structure' : 'Vérifier ma structure'}</span>
          </div>
          <button onClick={() => nav('/inscription/structure')} style={{ fontSize: 10, color: '#fff', background: T.grad, border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontWeight: 800 }}>
            Créer mon compte →
          </button>
        </div>

        {toast && <div style={{ marginBottom: 10, background: T.card, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '7px 11px', fontSize: 11, color: T.sub }}>{toast}</div>}

        {!verified ? (
          <>
            <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 17, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>Avant de publier, on vérifie ta structure</div>
              <div style={{ fontSize: 11, color: T.sub, lineHeight: 1.5, marginBottom: 16 }}>
                Seules les structures vérifiées peuvent publier des missions. Ton SIRET est contrôlé sur le registre INSEE.
              </div>
              <Fld label="Nom de la structure">
                <input value={vf.nom} onChange={(e) => setVf((x) => ({ ...x, nom: e.target.value }))} placeholder="Burger Nord" style={inp} />
              </Fld>
              <Fld label="SIRET">
                <input value={vf.siret} onChange={(e) => setVf((x) => ({ ...x, siret: e.target.value }))} placeholder="123 456 789 00012" style={inp} />
              </Fld>
              <button onClick={verifier} disabled={!vOk || checking} style={{ width: '100%', background: vOk && !checking ? '#fff' : T.row, color: vOk && !checking ? '#000' : T.mu, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: vOk && !checking ? 'pointer' : 'not-allowed', marginTop: 4 }}>
                {checking ? '⟳ Vérification au registre INSEE…' : vOk ? 'Vérifier ma structure' : 'Renseigne nom et SIRET'}
              </button>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.cb}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Démo — comptes fictifs</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button onClick={() => demo('pme')} style={{ background: T.row, color: T.text, border: `1px solid ${T.cb}`, borderRadius: 9, padding: '10px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}>
                    🏢 Burger Nord
                    <br />
                    <span style={{ fontSize: 9, color: T.cyan }}>PME · Restauration</span>
                  </button>
                  <button onClick={() => demo('asso')} style={{ background: T.row, color: T.text, border: `1px solid ${T.cb}`, borderRadius: 9, padding: '10px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}>
                    🤝 Banque Alimentaire
                    <br />
                    <span style={{ fontSize: 9, color: T.green }}>Association · ESS</span>
                  </button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: T.mu, textAlign: 'center', lineHeight: 1.5 }}>
              UROSI est une plateforme de mise en relation (modèle mandataire).
              <br />
              Aucun lien de subordination n'est créé.
            </div>
          </>
        ) : (
          <>
            {/* Bandeau structure */}
            <div style={{ background: T.card, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: '12px 15px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Av l={(vf.nom || 'S').charAt(0)} h={200} sz={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{vf.nom || 'Ma structure'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 6px' }}>✓ Vérifiée</span>
                  {stype && (
                    <span style={{ fontSize: 8, fontWeight: 700, color: stype.ess ? T.green : T.cyan, background: stype.ess ? T.greenBg : '#22d3ee15', border: `1px solid ${stype.ess ? '#14532d' : '#0e7490'}`, borderRadius: 8, padding: '1px 6px' }}>
                      {stype.ess ? '🤝 ' : '🏢 '}
                      {stype.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {TABS.map(([k, l, n]) => (
                <button
                  key={k}
                  onClick={() => {
                    setStab(k);
                    if (k === 'candidats') setCandMis(null);
                  }}
                  style={{ flex: 1, background: stab === k ? '#fff' : T.card, color: stab === k ? '#000' : T.sub, border: `1px solid ${stab === k ? '#fff' : T.cb}`, borderRadius: 9, padding: '8px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  {l}
                  {n > 0 && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 800, color: stab === k ? '#000' : T.cyan }}>{n}</span>}
                </button>
              ))}
            </div>

            {/* ── MISSIONS ── */}
            {stab === 'missions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setShowPub(true)} style={{ width: '100%', background: T.grad, color: '#fff', border: 'none', borderRadius: 11, padding: '12px 0', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginBottom: 2 }}>
                  ＋ Publier une mission
                </button>
                {mis.map((m, i) => {
                  const [sl, sc, sb] = STAG[m.st];
                  const cc = candCount(m.id);
                  return (
                    <div key={m.id}>
                      {i === 0 && <div style={{ fontSize: 9, fontWeight: 800, color: T.cyan, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 }}>★ Dernière mission publiée</div>}
                      <div style={{ background: T.card, border: `1px solid ${i === 0 ? '#0e7490' : T.cb}`, borderRadius: 12, padding: '13px 15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>{m.t}</div>
                            <div style={{ fontSize: 10, color: T.mu }}>📍 {m.adr} · {m.dt}</div>
                            {m.desc && <div style={{ fontSize: 10, color: T.sub, marginTop: 4, lineHeight: 1.45 }}>{m.desc}</div>}
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 900, color: m.solid ? T.green : T.text, flexShrink: 0, marginLeft: 10 }}>{m.solid ? 'Solidaire' : `${m.pay} €`}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: sc, background: sb, borderRadius: 8, padding: '2px 8px' }}>{sl}</span>
                          {cc > 0 ? (
                            <button
                              onClick={() => {
                                setCandMis(m.id);
                                setStab('candidats');
                              }}
                              style={{ fontSize: 10, fontWeight: 700, color: T.cyan, background: '#22d3ee15', border: 'none', borderRadius: 8, padding: '3px 9px', cursor: 'pointer' }}
                            >
                              {cc} candidat{cc > 1 ? 's' : ''} →
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: T.mu }}>{m.st === 'draft' ? 'Brouillon' : 'Aucun candidat pour l’instant'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CANDIDATS ── */}
            {stab === 'candidats' && (
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
                    Les travailleurs qui ont accepté tes missions. Tape un candidat pour voir son CV vivant, puis confirme ou refuse.
                  </div>
                )}
                {shown.map((c) => (
                  <div key={c.id} style={{ background: T.card, border: `1px solid ${c.dec === 'accepté' ? T.greenBorder : c.dec === 'refusé' ? T.redBorder : T.cb}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', display: 'flex', gap: 11, alignItems: 'center', cursor: 'pointer' }} onClick={() => setPanelC(c)}>
                      <Av l={c.av} h={c.hue} sz={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{c.nom}</span>
                          {c.fois > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: T.amber, background: T.amberBg, borderRadius: 8, padding: '1px 6px' }}>★ Habitué · {c.fois}×</span>}
                        </div>
                        <div style={{ fontSize: 10, color: T.mu, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {misTitle(c.mid)} · {c.ville} · {c.dist} km
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Stars n={c.note} size={10} />
                          <span style={{ fontSize: 10, color: T.mu }}>{c.note} · {c.nb} missions</span>
                        </div>
                      </div>
                      {c.dec && <span style={{ fontSize: 10, fontWeight: 800, color: c.dec === 'accepté' ? T.green : T.red, flexShrink: 0 }}>{c.dec}</span>}
                    </div>
                    {!c.dec && (
                      <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button onClick={() => decide(c.id, 'accepté')} style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}`, borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                          ✓ Accepter
                        </button>
                        <button onClick={() => decide(c.id, 'refusé')} style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {shown.length === 0 && (
                  <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: 20, textAlign: 'center', fontSize: 11, color: T.mu }}>
                    {candMis ? "Personne n'a encore accepté cette mission." : "Aucun candidat pour l'instant."}
                  </div>
                )}
              </div>
            )}

            {/* ── HABITUÉS ── */}
            {stab === 'habitues' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, color: T.sub, lineHeight: 1.5, marginBottom: 2 }}>Les travailleurs qui reviennent régulièrement chez toi.</div>
                {habitues.map((h) => (
                  <div key={h.nom} style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 11, alignItems: 'center' }}>
                    <Av l={h.av} h={h.hue} sz={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{h.nom}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Stars n={h.note} size={10} />
                        <span style={{ fontSize: 10, color: T.mu }}>{h.note} · dernière : {h.last}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: T.amber }}>{h.fois}×</div>
                      <div style={{ fontSize: 8, color: T.mu }}>missions ici</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Panneau candidat */}
        {panelC && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 400 }} onClick={() => setPanelC(null)}>
            <div style={{ width: '100%', maxWidth: 420, background: T.card, borderRadius: '20px 20px 0 0', padding: '18px 16px 26px', fontFamily: FONT }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 13 }}>
                <Av l={panelC.av} h={panelC.hue} sz={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: T.text }}>{panelC.nom}</span>
                    {panelC.fois > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: T.amber, background: T.amberBg, borderRadius: 8, padding: '1px 6px' }}>★ Habitué · {panelC.fois}×</span>}
                  </div>
                  <div style={{ fontSize: 10, color: T.mu, marginTop: 2 }}>
                    {panelC.ville} · {panelC.dist} km · candidat sur « {misTitle(panelC.mid)} »
                  </div>
                </div>
                <button onClick={() => setPanelC(null)} style={{ background: T.row, border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', color: T.sub, fontSize: 13 }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 13 }}>
                {([['Missions', String(panelC.nb)], ['Note', `${panelC.note}/5`], ['Chez toi', `${panelC.fois}×`]] as [string, string][]).map(([l, v]) => (
                  <div key={l} style={{ background: T.row, borderRadius: 8, padding: '9px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: T.text }}>{v}</div>
                    <div style={{ fontSize: 8, color: T.mu, marginTop: 1 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>Historique vérifié (CV vivant)</div>
              {panelC.hist.map(([t, d]) => (
                <div key={`${t}-${d}`} style={{ display: 'flex', justifyContent: 'space-between', background: T.row, borderRadius: 7, padding: '8px 11px', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{t}</span>
                  <span style={{ fontSize: 10, color: T.mu }}>{d}</span>
                </div>
              ))}
              {!panelC.dec ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                  <button onClick={() => decide(panelC.id, 'accepté')} style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}`, borderRadius: 8, padding: '11px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                    ✓ Accepter
                  </button>
                  <button onClick={() => decide(panelC.id, 'refusé')} style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Refuser
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, fontWeight: 800, color: panelC.dec === 'accepté' ? T.green : T.red }}>Décision : {panelC.dec}</div>
              )}
            </div>
          </div>
        )}

        {/* Publier (modal) */}
        {showPub && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 400 }} onClick={() => setShowPub(false)}>
            <div style={{ width: '100%', maxWidth: 420, background: T.card, borderRadius: '20px 20px 0 0', padding: '18px 16px 26px', fontFamily: FONT, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: T.text }}>Nouvelle mission</span>
                <button onClick={() => setShowPub(false)} style={{ background: T.row, border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', color: T.sub, fontSize: 14 }}>×</button>
              </div>
              <Fld label="Intitulé de la mission">
                <input value={f.t} onChange={(e) => setF((x) => ({ ...x, t: e.target.value }))} placeholder="Renfort service midi" style={inp} autoFocus />
              </Fld>
              <Fld label="Adresse">
                <input value={f.adr} onChange={(e) => setF((x) => ({ ...x, adr: e.target.value }))} placeholder="12 Rue de Béthune, Lille" style={inp} />
              </Fld>
              <Fld label="Jour">
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[0, 1, 2].map((o) => {
                    const l = dayLabel(o);
                    return (
                      <button key={o} onClick={() => setF((x) => ({ ...x, jour: l }))} style={{ background: f.jour === l ? '#fff' : T.row, color: f.jour === l ? '#000' : T.sub, border: `1px solid ${f.jour === l ? '#fff' : T.cb}`, borderRadius: 20, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {l}
                      </button>
                    );
                  })}
                  <button onClick={() => notif('Publication limitée à 48h à l’avance — flux constant. Planifier plus loin est réservé aux structures de confiance UROSI.')} style={{ background: T.row, color: T.mu, border: `1px dashed ${T.cb}`, borderRadius: 20, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    🔒 + tard
                  </button>
                </div>
                <div style={{ fontSize: 9, color: T.mu, marginTop: 7, lineHeight: 1.5 }}>
                  Publication ouverte à 48h à l'avance (flux constant). Au-delà : réservé aux structures de confiance UROSI.
                </div>
              </Fld>
              <Fld label="Horaire">
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {['11h – 15h', '18h – 23h', '9h – 17h', 'Soir', 'Journée'].map((h) => (
                    <button key={h} onClick={() => setF((x) => ({ ...x, horaire: h }))} style={{ background: f.horaire === h ? '#fff' : T.row, color: f.horaire === h ? '#000' : T.sub, border: `1px solid ${f.horaire === h ? '#fff' : T.cb}`, borderRadius: 20, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {h}
                    </button>
                  ))}
                </div>
                <input value={f.horaire} onChange={(e) => setF((x) => ({ ...x, horaire: e.target.value }))} placeholder="ou saisir : Aujourd'hui · 12h – 15h" style={inp} />
              </Fld>
              <Fld label="Descriptif de la mission">
                <textarea value={f.desc} onChange={(e) => setF((x) => ({ ...x, desc: e.target.value }))} rows={3} placeholder="Ce que le travailleur fera concrètement…" style={{ ...inp, resize: 'none', lineHeight: 1.5 }} />
              </Fld>
              {stype?.ess && (
                <Fld label="Type de mission">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button onClick={() => setF((x) => ({ ...x, solid: false }))} style={{ background: !f.solid ? '#fff' : T.row, color: !f.solid ? '#000' : T.sub, border: `1px solid ${!f.solid ? '#fff' : T.cb}`, borderRadius: 9, padding: '10px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                      € Rémunérée
                    </button>
                    <button onClick={() => setF((x) => ({ ...x, solid: true }))} style={{ background: f.solid ? '#16a34a' : T.row, color: f.solid ? '#fff' : T.green, border: `1px solid ${f.solid ? '#16a34a' : '#14532d'}`, borderRadius: 9, padding: '10px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                      🤝 Solidaire (0€)
                    </button>
                  </div>
                </Fld>
              )}
              {f.solid ? (
                <div style={{ background: T.greenBg, border: '1px solid #14532d', borderRadius: 9, padding: '11px 13px', marginBottom: 12, fontSize: 10.5, color: T.green, lineHeight: 1.55 }}>
                  🤝 Mission bénévole à 0 €. Elle comptera dans le CV vivant des participants. Réservée aux structures de l'ESS.
                </div>
              ) : (
                <Fld label="Rémunération (€)">
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
              )}
              <button onClick={publish} disabled={!ok} style={{ width: '100%', background: ok ? '#fff' : T.row, color: ok ? '#000' : T.mu, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: ok ? 'pointer' : 'not-allowed' }}>
                {ok ? (f.solid ? 'Publier — Solidaire (0 €)' : `Publier — ${f.pay} €`) : "Remplis l'intitulé et l'adresse"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
