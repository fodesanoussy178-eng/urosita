import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { theme } from '@/components/ui/theme';
import { MissionCard } from './MissionCard';
import { fetchOpenMissions } from './missionsService';
import { applyToMission, fetchMyApplications, type ApplicationWithMission } from './applicationsService';
import type { Mission } from './types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptee',
  rejected: 'Refusee',
  cancelled: 'Annulee',
};

export function WorkerMissionsPage() {
  const { session } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [applications, setApplications] = useState<ApplicationWithMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    setLoading(true);
    const [openMissions, myApplications] = await Promise.all([
      fetchOpenMissions(),
      fetchMyApplications(session.user.id),
    ]);
    setMissions(openMissions);
    setApplications(myApplications);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleApply(missionId: string) {
    if (!session) return;
    setError(null);
    setApplyingId(missionId);
    try {
      await applyToMission(missionId, session.user.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de postuler.');
    } finally {
      setApplyingId(null);
    }
  }

  const appliedMissionIds = new Set(applications.map((a) => a.mission_id));

  return (
    <div style={{ textAlign: 'left' }}>
      <h2 style={{ fontSize: 18, marginTop: 24 }}>Missions ouvertes</h2>
      {loading && <p style={theme.sub}>Chargement...</p>}
      {!loading && missions.length === 0 && (
        <p style={theme.sub}>Aucune mission ouverte pour l'instant. Elles apparaitront ici des qu'une structure en publie.</p>
      )}
      {error && <p style={theme.err}>{error}</p>}
      {missions.map((mission) => {
        const alreadyApplied = appliedMissionIds.has(mission.id);
        return (
          <MissionCard
            key={mission.id}
            mission={mission}
            action={
              alreadyApplied ? (
                <span style={theme.badge}>Deja postule</span>
              ) : (
                <Button
                  style={{ marginTop: 0, width: 'auto', padding: '9px 18px' }}
                  onClick={() => handleApply(mission.id)}
                  disabled={applyingId === mission.id}
                >
                  {applyingId === mission.id ? '...' : 'Postuler'}
                </Button>
              )
            }
          />
        );
      })}

      {applications.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 32 }}>Mes candidatures</h2>
          {applications.map((application) => (
            <div key={application.id} style={theme.mission}>
              <strong>{application.mission?.title ?? 'Mission supprimee'}</strong>
              <p style={{ ...theme.sub, margin: '8px 0 0', fontSize: 13 }}>
                {application.mission?.scheduled_date} - {STATUS_LABELS[application.status]}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
