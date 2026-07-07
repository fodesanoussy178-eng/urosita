import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONT } from '@/components/ui/theme';

export const DEMO_SECONDS = 30;

// Enveloppe la démo publique : compte à rebours visible, puis l'écran se fige
// (pointer-events coupés + flou) et seul l'appel à créer un compte reste actif.
export function DemoGate({ role, children }: { role: 'travailleur' | 'structure'; children: ReactNode }) {
  const nav = useNavigate();
  const [left, setLeft] = useState(DEMO_SECONDS);

  useEffect(() => {
    const iv = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(iv);
  }, []);

  const frozen = left <= 0;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg }}>
      <div style={frozen ? { pointerEvents: 'none', userSelect: 'none', filter: 'blur(4px)', opacity: 0.55 } : undefined} aria-hidden={frozen}>
        {children}
      </div>

      {!frozen && (
        <div style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 900, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(10,10,20,.9)', border: `1px solid ${T.cb}`, borderRadius: 20, padding: '5px 12px', fontFamily: FONT, backdropFilter: 'blur(6px)' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: T.cyan, letterSpacing: 0.5 }}>DÉMO · données fictives</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: left <= 10 ? T.amber : T.sub, minWidth: 26, textAlign: 'right' }}>{left} s</span>
        </div>
      )}

      {frozen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,20,.55)', fontFamily: FONT, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 340, background: T.card, border: `1px solid ${T.cb}`, borderRadius: 18, padding: '24px 20px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>⏸</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: T.text, marginBottom: 7 }}>Fin de la démo</div>
            <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, marginBottom: 18 }}>
              {role === 'travailleur'
                ? "Tu as vu comment ça marche. Crée ton compte gratuit pour accéder aux vraies missions près de chez toi."
                : "Tu as vu l'espace structure. Crée ton compte pour préparer tes missions — l'abonnement n'est demandé qu'au moment de publier."}
            </div>
            <button
              onClick={() => nav(`/inscription/${role}`)}
              style={{ width: '100%', background: role === 'structure' ? T.grad : '#fff', color: role === 'structure' ? '#fff' : '#000', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginBottom: 8 }}
            >
              {role === 'travailleur' ? 'Créer mon compte gratuit' : "Créer mon espace structure"}
            </button>
            <button onClick={() => nav('/connexion')} style={{ width: '100%', background: T.row, color: T.sub, border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
              Déjà un compte ? Se connecter
            </button>
            <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.mu, textDecoration: 'underline' }}>
              ← Retour à l'accueil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
