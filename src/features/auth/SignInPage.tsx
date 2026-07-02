import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Fld } from '@/components/ui/Fld';
import { T, FONT, inp } from '@/components/ui/theme';
import { signIn } from './authService';

export function SignInPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', justifyContent: 'center', fontFamily: FONT, padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 900, fontSize: 15, color: T.text }}>Connexion</span>
          <button onClick={() => nav('/')} style={{ fontSize: 10, color: T.mu, background: 'none', border: `1px solid ${T.cb}`, borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>
            ← Accueil
          </button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Logo sz={54} />
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 14, padding: 17 }}>
          <Fld label="Email">
            <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@email.com" style={inp} inputMode="email" type="email" autoFocus />
          </Fld>
          <Fld label="Mot de passe">
            <input aria-label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inp} type="password" onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </Fld>
          {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{error}</div>}
          <button
            onClick={submit}
            disabled={busy}
            style={{ width: '100%', background: busy ? T.row : '#fff', color: busy ? T.mu : '#000', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 900, cursor: busy ? 'not-allowed' : 'pointer', marginTop: 4 }}
          >
            {busy ? '…' : 'Se connecter'}
          </button>
          <button
            onClick={() => nav('/')}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.sub, textDecoration: 'underline', padding: '12px 0 0', fontWeight: 700 }}
          >
            Pas encore de compte ? S'inscrire
          </button>
        </div>
      </div>
    </div>
  );
}
