import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { theme } from '@/components/ui/theme';
import { MissionCard } from '@/features/missions/MissionCard';
import { Button } from '@/components/ui/Button';
import { fetchMissionsForStructure } from '@/features/missions/missionsService';
import type { Mission, Structure } from '@/features/missions/types';
import { fetchMyStructures } from './structureService';
import { CreateStructureForm } from './CreateStructureForm';
import { CreateMissionForm } from './CreateMissionForm';
import { ApplicantsPanel } from './ApplicantsPanel';

export function StructureDashboardPage() {
  const { session } = useAuth();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);

  const structure = structures[0] ?? null;

  async function loadStructures() {
    if (!session) return;
    setLoading(true);
    const data = await fetchMyStructures(session.user.id);
    setStructures(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!structure) {
      setMissions([]);
      return;
    }
    fetchMissionsForStructure(structure.id).then(setMissions);
  }, [structure]);

  if (loading) return <p style={theme.sub}>Chargement...</p>;

  if (!structure) {
    return session ? <CreateStructureForm ownerId={session.user.id} onCreated={(s) => setStructures([s])} /> : null;
  }

  return (
    <div style={{ textAlign: 'left' }}>
      <CreateMissionForm structureId={structure.id} onCreated={(m) => setMissions((prev) => [m, ...prev])} />

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Mes missions ({structure.name})</h2>
      {missions.length === 0 && <p style={theme.sub}>Aucune mission publiee pour l'instant.</p>}
      {missions.map((mission) => {
        const expanded = expandedMissionId === mission.id;
        return (
          <MissionCard
            key={mission.id}
            mission={mission}
            action={
              <>
                <Button
                  variant="secondary"
                  style={{ marginTop: 0, width: 'auto', padding: '8px 16px' }}
                  onClick={() => setExpandedMissionId(expanded ? null : mission.id)}
                >
                  {expanded ? 'Masquer les candidatures' : 'Voir les candidatures'}
                </Button>
                {expanded && <ApplicantsPanel missionId={mission.id} />}
              </>
            }
          />
        );
      })}
    </div>
  );
}
