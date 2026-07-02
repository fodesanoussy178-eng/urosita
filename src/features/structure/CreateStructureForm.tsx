import { useState } from 'react';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/Alert';
import { theme } from '@/components/ui/theme';
import { createStructure } from './structureService';
import type { Structure } from '@/features/missions/types';

export function CreateStructureForm({ ownerId, onCreated }: { ownerId: string; onCreated: (structure: Structure) => void }) {
  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setError('Le nom de la structure est requis.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const structure = await createStructure(ownerId, name.trim(), siret.trim());
      onCreated(structure);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de creer la structure.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...theme.card, marginTop: 24, textAlign: 'left' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Cree ta structure</h2>
      <p style={theme.sub}>Necessaire avant de publier des missions.</p>
      <TextField label="Nom de la structure" value={name} onChange={(e) => setName(e.target.value)} placeholder="Association / entreprise" />
      <TextField label="SIRET (optionnel)" value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" />
      {error && <ErrorText>{error}</ErrorText>}
      <Button onClick={submit} disabled={busy}>
        {busy ? '...' : 'Creer la structure'}
      </Button>
    </div>
  );
}
