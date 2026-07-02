import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorText, InfoText } from '@/components/ui/Alert';
import { theme } from '@/components/ui/theme';
import { updateProfile } from './profileService';

export function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [isMicroEntrepreneur, setIsMicroEntrepreneur] = useState(profile?.is_micro_entrepreneur ?? false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!session) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await updateProfile(session.user.id, { full_name: fullName, is_micro_entrepreneur: isMicroEntrepreneur });
      await refreshProfile();
      setInfo('Profil mis a jour.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise a jour impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...theme.card, marginTop: 24, textAlign: 'left' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Mon profil</h2>
      <TextField label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      {profile?.role === 'worker' && (
        <div style={theme.row}>
          <button type="button" style={theme.chip(!isMicroEntrepreneur)} onClick={() => setIsMicroEntrepreneur(false)}>
            Salarie
          </button>
          <button type="button" style={theme.chip(isMicroEntrepreneur)} onClick={() => setIsMicroEntrepreneur(true)}>
            Micro-entrepreneur
          </button>
        </div>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {info && <InfoText>{info}</InfoText>}
      <Button onClick={submit} disabled={busy}>
        {busy ? '...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
