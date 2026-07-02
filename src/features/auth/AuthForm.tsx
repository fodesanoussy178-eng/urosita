import { useState } from 'react';
import type { ProfileRole } from '@/types/database.types';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ErrorText, InfoText } from '@/components/ui/Alert';
import { theme } from '@/components/ui/theme';
import { signIn, signUp } from './authService';

type Mode = 'signin' | 'signup';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<ProfileRole>('worker');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const data = await signUp({ email, password, fullName, role });
        if (!data.session) {
          setInfo('Compte cree ! Si la confirmation email est active, verifie ta boite mail. Sinon, connecte-toi.');
        }
      } else {
        await signIn({ email, password });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div style={{ ...theme.card, marginTop: 50 }}>
        <h1 style={theme.title}>Urosi-t</h1>
        <p style={theme.sub}>{mode === 'signin' ? 'Connexion a ton espace' : 'Creer ton compte'}</p>
        {mode === 'signup' && (
          <>
            <TextField label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ton nom" />
            <label style={theme.label}>Je suis...</label>
            <div style={theme.row}>
              <button type="button" style={theme.chip(role === 'worker')} onClick={() => setRole('worker')}>
                Travailleur
              </button>
              <button
                type="button"
                style={theme.chip(role === 'structure_admin')}
                onClick={() => setRole('structure_admin')}
              >
                Structure
              </button>
            </div>
          </>
        )}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
        />
        {error && <ErrorText>{error}</ErrorText>}
        {info && <InfoText>{info}</InfoText>}
        <Button onClick={submit} disabled={busy}>
          {busy ? '...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
        </Button>
        <Button
          variant="link"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Deja un compte ? Se connecter'}
        </Button>
      </div>
    </PageShell>
  );
}
