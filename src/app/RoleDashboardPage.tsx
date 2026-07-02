import { useAuth } from '@/features/auth/AuthContext';
import { theme } from '@/components/ui/theme';
import { WorkerMissionsPage } from '@/features/missions/WorkerMissionsPage';
import { StructureDashboardPage } from '@/features/structure/StructureDashboardPage';

export function RoleDashboardPage() {
  const { profile } = useAuth();

  if (!profile) return <p style={theme.sub}>Chargement du profil...</p>;

  return profile.role === 'structure_admin' ? <StructureDashboardPage /> : <WorkerMissionsPage />;
}
