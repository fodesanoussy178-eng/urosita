import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { T, FONT } from '@/components/ui/theme';

export function EntryPage() {
  const nav = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: 16 }}>
      <div style={{ width: 300, textAlign: 'center' }}>
        <div style={{ marginBottom: 28 }}>
          <Logo sz={78} />
        </div>
        <div style={{ fontSize: 12, color: T.mu, marginBottom: 30 }}>Micro-missions · Métropole de Lille</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => nav('/demo/travailleur')}
            style={{ textAlign: 'left', padding: '16px 17px', borderRadius: 13, border: `1.5px solid ${T.cb}`, background: T.card, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 19, marginBottom: 5 }}>👷</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 2 }}>Je cherche des missions</div>
            <div style={{ fontSize: 12, color: T.mu }}>Essaie la démo · 30 s, puis crée ton compte</div>
          </button>
          <button
            onClick={() => nav('/demo/structure')}
            style={{ textAlign: 'left', padding: '16px 17px', borderRadius: 13, border: 'none', background: T.grad, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 19, marginBottom: 5 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Je publie des missions</div>
            <div style={{ fontSize: 12, color: '#bfdbfe' }}>Vois la démo · l'abonnement arrive à la publication</div>
          </button>
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: T.mu }}>
            S'inscrire directement :{' '}
            <button onClick={() => nav('/inscription/travailleur')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.sub, textDecoration: 'underline', fontWeight: 700, padding: 0 }}>
              Travailleur
            </button>
            {' · '}
            <button onClick={() => nav('/inscription/structure')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.sub, textDecoration: 'underline', fontWeight: 700, padding: 0 }}>
              Structure
            </button>
          </div>
          <button
            onClick={() => nav('/connexion')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.sub, textDecoration: 'underline', fontWeight: 700 }}
          >
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
