import { useState } from 'react';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/Alert';
import { theme } from '@/components/ui/theme';
import { createMission } from '@/features/missions/missionsService';
import type { Mission } from '@/features/missions/types';

const MAX_DURATION_MINUTES = 300;

export function CreateMissionForm({ structureId, onCreated }: { structureId: string; onCreated: (mission: Mission) => void }) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [city, setCity] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [durationHours, setDurationHours] = useState('2');
  const [rateEuros, setRateEuros] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const durationMinutes = Math.round(Number(durationHours) * 60);
    const rateCents = Math.round(Number(rateEuros) * 100);

    if (!title.trim() || !scheduledDate) {
      setError('Titre et date sont requis.');
      return;
    }
    if (!durationMinutes || durationMinutes <= 0 || durationMinutes > MAX_DURATION_MINUTES) {
      setError('La duree doit etre comprise entre 0 et 5h (plafond legal).');
      return;
    }
    if (!rateCents || rateCents <= 0) {
      setError('Le taux net doit etre superieur a 0.');
      return;
    }

    setBusy(true);
    try {
      const mission = await createMission({
        structure_id: structureId,
        title: title.trim(),
        detail: detail.trim() || null,
        city: city.trim() || null,
        scheduled_date: scheduledDate,
        duration_minutes: durationMinutes,
        worker_rate_cents: rateCents,
      });
      onCreated(mission);
      setTitle('');
      setDetail('');
      setCity('');
      setScheduledDate('');
      setDurationHours('2');
      setRateEuros('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de creer la mission.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...theme.card, marginTop: 24, textAlign: 'left' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Publier une mission</h2>
      <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aide evenementielle" />
      <TextField label="Detail (optionnel)" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Description de la mission" />
      <TextField label="Ville" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lille" />
      <TextField label="Date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
      <TextField
        label="Duree (heures, max 5)"
        type="number"
        min="0.5"
        max="5"
        step="0.5"
        value={durationHours}
        onChange={(e) => setDurationHours(e.target.value)}
      />
      <TextField
        label="Taux net travailleur (EUR)"
        type="number"
        min="0"
        step="0.01"
        value={rateEuros}
        onChange={(e) => setRateEuros(e.target.value)}
        placeholder="68.00"
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Button onClick={submit} disabled={busy}>
        {busy ? '...' : 'Publier la mission'}
      </Button>
    </div>
  );
}
