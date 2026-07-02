import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { theme } from '@/components/ui/theme';
import {
  fetchApplicationsForMission,
  updateApplicationStatus,
  type ApplicationWithApplicant,
} from '@/features/missions/applicationsService';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptee',
  rejected: 'Refusee',
  cancelled: 'Annulee',
};

export function ApplicantsPanel({ missionId }: { missionId: string }) {
  const [applications, setApplications] = useState<ApplicationWithApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchApplicationsForMission(missionId);
    setApplications(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  async function decide(applicationId: string, status: 'accepted' | 'rejected') {
    setError(null);
    setBusyId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p style={theme.sub}>Chargement des candidatures...</p>;
  if (applications.length === 0) return <p style={theme.sub}>Aucune candidature pour l'instant.</p>;

  return (
    <div style={{ marginTop: 10 }}>
      {error && <p style={theme.err}>{error}</p>}
      {applications.map((application) => (
        <div key={application.id} style={{ ...theme.mission, marginTop: 8 }}>
          <strong>{application.profile?.full_name || 'Candidat'}</strong>
          <p style={{ ...theme.sub, margin: '6px 0 0', fontSize: 13 }}>{STATUS_LABELS[application.status]}</p>
          {application.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button
                style={{ marginTop: 0, width: 'auto', padding: '8px 16px' }}
                disabled={busyId === application.id}
                onClick={() => decide(application.id, 'accepted')}
              >
                Accepter
              </Button>
              <Button
                variant="secondary"
                style={{ marginTop: 0, width: 'auto', padding: '8px 16px' }}
                disabled={busyId === application.id}
                onClick={() => decide(application.id, 'rejected')}
              >
                Refuser
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
