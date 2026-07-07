import { useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONT, inp } from '@/components/ui/theme';
import { Stars } from '@/components/ui/Stars';
import { QRBadge } from '@/components/ui/QRBadge';
import { DemoGate } from './DemoGate';
import { DemoStructPage } from './DemoStructPage';
import { FLUX0, HIST0, MOTIFS, type DemoHist, type DemoMission } from './demoData';

// Démo travailleur : reprise fidèle du prototype UROSI T MVP, 100 % locale
// (aucun appel Supabase). L'écran est figé après 30 s par DemoGate.

type Tab = 'flux' | 'moi' | 'wallet';

const S: CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'flex-end', zIndex: 50 };
const SH: CSSProperties = { width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '18px 16px 28px' };

export function DemoWorkerPage() {
  return (
    <DemoGate role="travailleur">
      <DemoWorkerApp />
    </DemoGate>
  );
}

function DemoWorkerApp() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('flux');
  const [mine, setMine] = useState<DemoMission[]>([]);
  const [hist, setHist] = useState<DemoHist[]>(HIST0);
  const [detail, setDetail] = useState<DemoMission | null>(null);
  const [alrt, setAlrt] = useState<{ m: DemoMission; type: 'retard' | 'annulation' } | null>(null);
  const [signal, setSignal] = useState<DemoMission | null>(null);
  const [sigMotif, setSigMotif] = useState<string | null>(null);
  const [sigNote, setSigNote] = useState('');
  const [recap, setRecap] = useState<DemoMission | null>(null);
  const [structPage, setStructPage] = useState<string | null>(null);
  const [kycDone, setKycDone] = useState(false);
  const [kycFor, setKycFor] = useState<DemoMission | null>(null);
  const [kyc, setKyc] = useState({ idOk: false, iban: '' });
  const [wallet, setWallet] = useState({ dispo: 128, attente: 0 });
  const [gagne, setGagne] = useState({ mois: 340, annee: 1240 });
  const [withdraw, setWithdraw] = useState(false);
  const [wAmt, setWAmt] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const tr = useRef<ReturnType<typeof setTimeout>>();
  const rtimer = useRef<ReturnType<typeof setTimeout>>();
  const profil = { prenom: 'Fodé', nom: 'A.', ville: 'Tourcoing' };

  const notif = (m: string) => {
    setToast(m);
    clearTimeout(tr.current);
    tr.current = setTimeout(() => setToast(null), 3000);
  };
  const rated = hist.filter((h) => h.note > 0);
  const moyenne = rated.length ? (rated.reduce((s, h) => s + h.note, 0) / rated.length).toFixed(1) : '—';
  const kycOk = kyc.idOk && kyc.iban.replace(/\s/g, '').length >= 14;

  const accept = (m: DemoMission) => {
    if (mine.find((a) => a.id === m.id)) return;
    if (m.pay > 0 && !kycDone) {
      setKycFor(m);
      setDetail(null);
      return;
    }
    setMine((l) => [...l, m]);
    setDetail(null);
    notif('✓ Acceptée — retrouve-la dans Mes missions.');
  };
  const kycConfirm = () => {
    if (!kycOk) return;
    setKycDone(true);
    const m = kycFor;
    setKycFor(null);
    if (m) {
      setMine((l) => [...l, m]);
      notif('✓ Identité vérifiée — mission acceptée !');
      setTab('moi');
    }
  };
  const rate = (n: number) => {
    if (!recap) return;
    const m = recap;
    setHist((h) => [{ t: m.t, s: m.struct, note: n, dt: new Date().toLocaleDateString('fr', { day: '2-digit', month: '2-digit' }), pay: m.pay }, ...h]);
    setMine((l) => l.filter((a) => a.id !== m.id));
    setRecap(null);
    if (m.pay > 0) {
      setWallet((w) => ({ ...w, attente: w.attente + m.pay }));
      setGagne((g) => ({ mois: g.mois + m.pay, annee: g.annee + m.pay }));
      clearTimeout(rtimer.current);
      rtimer.current = setTimeout(() => {
        setWallet((w) => ({ dispo: w.dispo + m.pay, attente: Math.max(0, w.attente - m.pay) }));
        notif(`+${m.pay}€ disponibles au retrait.`);
      }, 4000);
      notif(`Mission ajoutée à ton CV · +${m.pay}€ (dispo à J+3)`);
    } else notif('Mission ajoutée à ton CV vivant ✓');
  };
  const doWithdraw = (amt: number) => {
    const a = Math.min(amt, wallet.dispo);
    if (a <= 0) return;
    setWallet((w) => ({ ...w, dispo: w.dispo - a }));
    setWithdraw(false);
    setWAmt('');
    notif(`${a}€ envoyés sur ton compte · réception J+1 (Lemonway).`);
  };
  const closeSignal = () => {
    setSignal(null);
    setSigMotif(null);
    setSigNote('');
  };

  const wOk = !!wAmt && parseInt(wAmt, 10) > 0 && parseInt(wAmt, 10) <= wallet.dispo;

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', justifyContent: 'center', padding: '44px 0 16px', fontFamily: FONT }}>
      <div style={{ width: 385, maxWidth: '96vw', background: T.bg, borderRadius: 40, border: `1px solid ${T.cb}`, display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.5)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '22px 16px 12px', borderBottom: `1px solid ${T.cb}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 14 }}>U</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.cyan, background: '#22d3ee15', borderRadius: 20, padding: '3px 8px' }}>{hist.length} missions au CV</span>
          </div>
          <button onClick={() => nav('/inscription/travailleur')} style={{ fontSize: 10, color: '#000', background: '#fff', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontWeight: 800 }}>
            Créer mon compte →
          </button>
        </div>

        {toast && <div style={{ margin: '8px 12px 0', background: T.card, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '7px 11px', fontSize: 11, color: T.sub }}>{toast}</div>}

        <div style={{ padding: '10px 12px', minHeight: 440, flex: 1 }}>
          {/* ── FLUX ── */}
          {tab === 'flux' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {FLUX0.map((m) => {
                const isA = !!mine.find((a) => a.id === m.id);
                return (
                  <div key={m.id} onClick={() => setDetail(m)} style={{ background: T.card, border: `1px solid ${m.solid ? '#14532d' : T.cb}`, borderRadius: 14, cursor: 'pointer', overflow: 'hidden' }}>
                    <div style={{ padding: '15px 15px 12px' }}>
                      {m.solid ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 24, fontWeight: 900, color: T.green, letterSpacing: -1 }}>Solidaire</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: T.sub }}>0 €</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 33, fontWeight: 900, color: T.text, letterSpacing: -2, lineHeight: 1, marginBottom: 6 }}>{m.pay} €</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 5 }}>{m.t}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setStructPage(m.struct);
                          }}
                          style={{ fontSize: 11, fontWeight: 700, color: T.sub, textDecoration: 'underline', textDecorationColor: T.cb, cursor: 'pointer' }}
                        >
                          {m.struct} ›
                        </span>
                        {m.solid && <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 6px' }}>🤝 Association</span>}
                        {m.verif && <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 5px' }}>✓ Vérifié</span>}
                        {m.sNote ? (
                          <>
                            <Stars n={m.sNote} size={11} />
                            <span style={{ fontSize: 10, color: T.mu }}>{m.sNote}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 8, fontWeight: 700, color: T.cyan, background: '#22d3ee15', borderRadius: 8, padding: '1px 6px' }}>Nouvelle</span>
                        )}
                      </div>
                      {m.solid && <div style={{ fontSize: 9.5, color: T.green, marginTop: 3, marginBottom: 1 }}>Compte dans ton CV vivant · sans rémunération</div>}
                      <div style={{ fontSize: 10, color: T.mu }}>📍 {m.adr} · {m.d} km</div>
                    </div>
                    <div style={{ padding: '0 15px 13px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          accept(m);
                        }}
                        disabled={isA}
                        style={{ width: '100%', background: isA ? T.greenBg : m.solid ? '#16a34a' : '#fff', color: isA ? T.green : m.solid ? '#fff' : '#000', border: 'none', borderRadius: 9, padding: '10px 0', fontSize: 13, fontWeight: 900, cursor: isA ? 'default' : 'pointer' }}
                      >
                        {isA ? (m.solid ? '✓ Inscrit·e' : '✓ Acceptée') : m.solid ? '🤝 Participer' : 'Accepter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MES MISSIONS + CV VIVANT ── */}
          {tab === 'moi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mine.map((m) => (
                <div key={m.id} style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 15 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 2 }}>{m.t}</div>
                  <div style={{ fontSize: 10, color: T.mu, marginBottom: 11 }}>{m.struct} · 📍 {m.adr}</div>
                  <div style={{ background: '#fff', borderRadius: 11, padding: '14px 0 9px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 11 }}>
                    <QRBadge value={`https://urosi.fr/demo/pointage/${m.id}`} size={136} />
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontWeight: 600 }}>Journal de présence · facultatif</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
                    <button onClick={() => setAlrt({ m, type: 'retard' })} style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}`, borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>⏱ Retard</button>
                    <button onClick={() => setAlrt({ m, type: 'annulation' })} style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✕ Annuler</button>
                  </div>
                  <button onClick={() => setRecap(m)} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginBottom: 6 }}>
                    ▦ Terminer la mission
                  </button>
                  <button onClick={() => setSignal(m)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#f59e0b', textDecoration: 'underline' }}>
                    ⚠ Signaler un problème
                  </button>
                </div>
              ))}

              {mine.length === 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: T.sub, marginBottom: 12 }}>Aucune mission en cours</div>
                  <button onClick={() => setTab('flux')} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    Voir le flux →
                  </button>
                </div>
              )}

              {/* CV VIVANT */}
              <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 15 }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 13 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#f97316,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 17 }}>{profil.prenom.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{profil.prenom} {profil.nom}</div>
                    <div style={{ fontSize: 10, color: T.mu }}>{profil.ville} · CV vivant</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 13 }}>
                  {([['Missions prouvées', String(hist.length)], ['Note moyenne', `★ ${moyenne}`]] as [string, string][]).map(([l, v]) => (
                    <div key={l} style={{ background: T.row, borderRadius: 9, padding: '11px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{v}</div>
                      <div style={{ fontSize: 9, color: T.mu, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Historique vérifié</div>
                {hist.map((h, i) => (
                  <div key={`${h.t}-${h.dt}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? `1px solid ${T.cb}` : 'none' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.t}</div>
                      <div style={{ fontSize: 9, color: T.mu }}>{h.s} · {h.dt}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {h.note > 0 && <Stars n={h.note} size={10} />}
                      {h.pay > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{h.pay} €</span> : <span style={{ fontSize: 9, fontWeight: 800, color: T.green }}>🤝 Solidaire</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── WALLET ── */}
          {tab === 'wallet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 10, color: T.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Disponible</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1, marginBottom: 14 }}>
                  {wallet.dispo}
                  <span style={{ fontSize: 18, color: T.green, marginLeft: 4 }}>€</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => wallet.dispo > 0 && doWithdraw(wallet.dispo)} disabled={wallet.dispo <= 0} style={{ background: wallet.dispo > 0 ? '#16a34a' : T.row, color: wallet.dispo > 0 ? '#fff' : T.mu, border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 13, fontWeight: 800, cursor: wallet.dispo > 0 ? 'pointer' : 'not-allowed' }}>
                    Tout retirer
                  </button>
                  <button onClick={() => wallet.dispo > 0 && setWithdraw(true)} disabled={wallet.dispo <= 0} style={{ background: wallet.dispo > 0 ? '#fff' : T.row, color: wallet.dispo > 0 ? '#000' : T.mu, border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 13, fontWeight: 800, cursor: wallet.dispo > 0 ? 'pointer' : 'not-allowed' }}>
                    Choisir le montant
                  </button>
                </div>
              </div>

              {wallet.attente > 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 9, color: T.amber, fontWeight: 700, marginBottom: 1 }}>En attente · dispo à J+3</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: T.amber }}>{wallet.attente} €</div>
                  </div>
                  <span style={{ fontSize: 9, color: T.mu, textAlign: 'right', maxWidth: 110, lineHeight: 1.4 }}>Fonds cantonnés chez Lemonway (agréé ACPR)</span>
                </div>
              )}

              <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: '12px 15px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 }}>💡 Retire ce que tu veux, quand tu veux</div>
                <div style={{ fontSize: 10.5, color: T.sub, lineHeight: 1.55 }}>
                  Tu n'es pas obligé de tout sortir. Laisse une partie au chaud dans ton wallet et retire par petites tranches. Ton argent reste à toi, disponible à tout moment.
                </div>
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: '13px 15px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Pour ta déclaration</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {([['Ce mois-ci', gagne.mois], ['Cette année', gagne.annee]] as [string, number][]).map(([l, v]) => (
                    <div key={l} style={{ background: T.row, borderRadius: 9, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>{v} €</div>
                      <div style={{ fontSize: 9, color: T.mu, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.mu, marginBottom: 4 }}>
                  <span>Seuil de déclaration (DAC7)</span>
                  <span>{gagne.annee} / 2 000 €</span>
                </div>
                <div style={{ height: 5, background: T.row, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (gagne.annee / 2000) * 100)}%`, background: gagne.annee >= 2000 ? '#f59e0b' : T.cyan, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 10, color: T.sub, lineHeight: 1.55 }}>
                  Au-delà de 2 000 € ou 30 missions par an, UROSI déclare tes revenus à la DGFiP (DAC7) et te prévient avant le seuil. Pense à les reporter sur <span style={{ color: T.cyan }}>impots.gouv.fr</span>.
                </div>
              </div>

              <div style={{ fontSize: 8.5, color: T.mu, textAlign: 'center', lineHeight: 1.5, padding: '2px 8px' }}>Tes fonds sont cantonnés chez Lemonway, agréé ACPR. UROSI ne détient jamais ton argent.</div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ borderTop: `1px solid ${T.cb}`, padding: '6px 10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {([['flux', '🗂', 'Flux'], ['moi', '👤', 'Missions'], ['wallet', '💳', 'Wallet']] as [Tab, string, string][]).map(([k, ic, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#000' : T.mu, position: 'relative' }}>
              <span style={{ fontSize: 14 }}>{ic}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{l}</span>
              {k === 'moi' && mine.length > 0 && <span style={{ position: 'absolute', top: 4, right: 14, width: 6, height: 6, borderRadius: '50%', background: T.cyan }} />}
              {k === 'wallet' && wallet.attente > 0 && <span style={{ position: 'absolute', top: 4, right: 14, width: 6, height: 6, borderRadius: '50%', background: T.amber }} />}
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
              {detail.solid ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: T.green, letterSpacing: -1 }}>Mission solidaire</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: T.sub }}>0 €</span>
                </div>
              ) : (
                <div style={{ fontSize: 30, fontWeight: 900, color: T.text, letterSpacing: -2, marginBottom: 4 }}>{detail.pay} €</div>
              )}
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 10 }}>{detail.t}</div>
              <div
                onClick={() => {
                  setStructPage(detail.struct);
                  setDetail(null);
                }}
                style={{ background: T.row, borderRadius: 11, padding: '12px 13px', marginBottom: 11, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{detail.struct}</span>
                  {detail.verif && <span style={{ fontSize: 8, fontWeight: 700, color: T.green, background: T.greenBg, borderRadius: 8, padding: '1px 5px' }}>✓ Vérifié</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: T.cyan, fontWeight: 700 }}>Voir la fiche ›</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {detail.sNote ? (
                    <>
                      <Stars n={detail.sNote} size={13} />
                      <span style={{ fontSize: 11, color: T.sub, fontWeight: 700 }}>{detail.sNote}/5</span>
                      <span style={{ fontSize: 10, color: T.mu }}>· {detail.sNb} avis</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: T.sub }}>Nouvelle structure — pas encore d'avis. Sera classée après ses premières missions.</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.sub }}>
                  📍 {detail.adr}
                  <span style={{ color: T.mu }}> · {detail.d} km</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.55, marginBottom: 13 }}>{detail.desc}</div>
              <button
                onClick={() => accept(detail)}
                disabled={!!mine.find((a) => a.id === detail.id)}
                style={{ width: '100%', background: mine.find((a) => a.id === detail.id) ? T.greenBg : detail.solid ? '#16a34a' : '#fff', color: mine.find((a) => a.id === detail.id) ? T.green : detail.solid ? '#fff' : '#000', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}
              >
                {mine.find((a) => a.id === detail.id) ? '✓ Déjà acceptée' : detail.solid ? '🤝 Participer à la mission' : `Accepter — ${detail.pay} €`}
              </button>
            </div>
          </div>
        )}

        {/* Retard / Annulation */}
        {alrt && (
          <div style={S} onClick={() => setAlrt(null)}>
            <div style={SH} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 800, color: alrt.type === 'retard' ? T.amber : T.red, marginBottom: 5 }}>{alrt.type === 'retard' ? '⏱ Signaler un retard' : '✕ Annuler la mission'}</div>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 13, lineHeight: 1.5 }}>
                {alrt.type === 'retard' ? 'La structure sera prévenue.' : "La structure sera prévenue, à titre informatif. Aucun blocage de ton accès aux missions."}
              </div>
              {alrt.type === 'retard' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {['5 min', '10 min', '20 min', '30 min+'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        notif(`Retard ${t} signalé.`);
                        setAlrt(null);
                      }}
                      style={{ flex: 1, background: T.row, color: T.text, border: `1px solid ${T.cb}`, borderRadius: 7, padding: '9px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={() => setAlrt(null)} style={{ flex: 1, background: T.row, color: T.sub, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Revenir
                  </button>
                  <button
                    onClick={() => {
                      setMine((l) => l.filter((a) => a.id !== alrt.m.id));
                      notif('Mission annulée.');
                      setAlrt(null);
                    }}
                    style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Confirmer l'annulation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signalement */}
        {signal && (
          <div style={S} onClick={closeSignal}>
            <div style={{ ...SH, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#f59e0b', marginBottom: 3 }}>⚠ Signaler un problème</div>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{signal.t} · {signal.struct}</div>
              <div style={{ fontSize: 10, color: T.mu, marginBottom: 13, lineHeight: 1.55 }}>
                UROSI transmet ton signalement et joue l'intermédiaire. Aucun impact sur ton accès aux missions — signaler ne te pénalise jamais.
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>Motif</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {Object.entries(MOTIFS).map(([k, l]) => (
                  <button key={k} onClick={() => setSigMotif(k)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9, background: sigMotif === k ? T.amberBg : T.row, color: sigMotif === k ? '#f59e0b' : T.text, border: `1.5px solid ${sigMotif === k ? '#f59e0b' : T.cb}`, borderRadius: 8, padding: '11px 13px', fontSize: 12, fontWeight: sigMotif === k ? 800 : 600, cursor: 'pointer' }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${sigMotif === k ? '#f59e0b' : T.cb}`, background: sigMotif === k ? '#f59e0b' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#000', fontWeight: 900 }}>{sigMotif === k ? '✓' : ''}</span>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>En deux mots, que s'est-il passé ?</div>
              <textarea
                value={sigNote}
                onChange={(e) => setSigNote(e.target.value)}
                rows={3}
                placeholder="Ex : la structure n'était pas sur place à l'heure convenue…"
                style={{ ...inp, resize: 'none', lineHeight: 1.5, marginBottom: 12 }}
              />
              <button
                onClick={() => {
                  notif('Signalement transmis — on revient vers toi sous 24h.');
                  closeSignal();
                }}
                disabled={!sigMotif}
                style={{ width: '100%', background: sigMotif ? '#f59e0b' : T.row, color: sigMotif ? '#000' : T.mu, border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 13, fontWeight: 900, cursor: sigMotif ? 'pointer' : 'not-allowed' }}
              >
                {sigMotif ? 'Envoyer le signalement' : 'Choisis un motif'}
              </button>
              <button onClick={closeSignal} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.mu, padding: '10px 0 0' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Recap + étoiles */}
        {recap && (
          <div style={{ ...S, background: 'rgba(0,0,0,.92)' }}>
            <div style={SH} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: T.green }}>Mission terminée !</div>
                  <div style={{ fontSize: 10, color: T.mu }}>{recap.t} · {recap.struct}</div>
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
              <button onClick={() => rate(0)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.mu, padding: '4px 0' }}>
                Passer
              </button>
            </div>
          </div>
        )}

        {/* Retrait */}
        {withdraw && (
          <div style={S} onClick={() => { setWithdraw(false); setWAmt(''); }}>
            <div style={SH} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.text, marginBottom: 3 }}>Retirer un montant</div>
              <div style={{ fontSize: 11, color: T.mu, marginBottom: 14 }}>Disponible : {wallet.dispo} € · retire ce que tu veux.</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 14 }}>
                <input
                  value={wAmt}
                  onChange={(e) => setWAmt(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="0"
                  style={{ width: 130, background: 'transparent', border: 'none', borderBottom: `2px solid ${T.cb}`, color: T.text, fontSize: 40, fontWeight: 900, textAlign: 'center', outline: 'none', fontFamily: FONT }}
                />
                <span style={{ fontSize: 26, fontWeight: 900, color: T.sub }}>€</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[20, 50, 100].filter((v) => v <= wallet.dispo).map((v) => (
                  <button key={v} onClick={() => setWAmt(String(v))} style={{ flex: 1, background: T.row, color: T.text, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {v} €
                  </button>
                ))}
                <button onClick={() => setWAmt(String(wallet.dispo))} style={{ flex: 1, background: T.row, color: T.green, border: `1px solid ${T.cb}`, borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Max
                </button>
              </div>
              <button onClick={() => doWithdraw(parseInt(wAmt || '0', 10))} disabled={!wOk} style={{ width: '100%', background: wOk ? '#16a34a' : T.row, color: wOk ? '#fff' : T.mu, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
                {wAmt && parseInt(wAmt, 10) > wallet.dispo ? 'Montant trop élevé' : `Retirer ${wAmt || '0'} €`}
              </button>
              <div style={{ fontSize: 9, color: T.mu, textAlign: 'center', marginTop: 9 }}>Réception sur ton compte à J+1 · fonds cantonnés Lemonway (ACPR)</div>
            </div>
          </div>
        )}

        {/* KYC — à la 1re mission payée */}
        {kycFor && (
          <div style={{ ...S, background: 'rgba(0,0,0,.9)' }} onClick={() => setKycFor(null)}>
            <div style={{ ...SH, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 4 }}>Vérifions ton identité</div>
              <div style={{ fontSize: 11, color: T.sub, lineHeight: 1.55, marginBottom: 16 }}>
                Une seule fois, avant ta première mission payée. C'est ce qui permet d'être payé sur ton compte. Ensuite, on ne te le redemandera plus.
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>Pièce d'identité</div>
              <button onClick={() => setKyc((k) => ({ ...k, idOk: true }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: kyc.idOk ? T.greenBg : T.row, color: kyc.idOk ? T.green : T.text, border: `1.5px solid ${kyc.idOk ? T.greenBorder : T.cb}`, borderRadius: 10, padding: '13px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginBottom: 14 }}>
                {kyc.idOk ? "✓ Pièce d'identité ajoutée" : "＋ Photographier ma carte d'identité"}
              </button>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.mu, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 }}>IBAN (pour être payé)</div>
              <input value={kyc.iban} onChange={(e) => setKyc((k) => ({ ...k, iban: e.target.value.toUpperCase() }))} placeholder="FR76 ...." style={{ ...inp, marginBottom: 14, letterSpacing: 1 }} />
              <div style={{ background: T.row, borderRadius: 9, padding: '10px 12px', fontSize: 9.5, color: T.mu, lineHeight: 1.55, marginBottom: 14 }}>
                🔒 Vérification opérée par Lemonway (agréé ACPR). UROSI ne stocke pas ta pièce d'identité et ne détient jamais ton argent.
              </div>
              <button onClick={kycConfirm} disabled={!kycOk} style={{ width: '100%', background: kycOk ? '#16a34a' : T.row, color: kycOk ? '#fff' : T.mu, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
                {kycOk ? 'Valider et accepter la mission' : 'Ajoute ta pièce et ton IBAN'}
              </button>
              <button onClick={() => setKycFor(null)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.mu, padding: '10px 0 0' }}>
                Plus tard
              </button>
            </div>
          </div>
        )}

        {structPage && <DemoStructPage name={structPage} onBack={() => setStructPage(null)} />}
      </div>
    </div>
  );
}
