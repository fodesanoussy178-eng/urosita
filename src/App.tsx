import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { AuthForm } from '@/features/auth/AuthForm';
import { Centered } from '@/components/ui/PageShell';
import { isSupabaseConfigured } from '@/lib/supabase';
import { DashboardLayout } from '@/app/DashboardLayout';
import { RoleDashboardPage } from '@/app/RoleDashboardPage';
import { ProfilePage } from '@/features/profile/ProfilePage';

function AppShell() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <p>Backend non configure : verifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel.</p>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <p>Chargement...</p>
      </Centered>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
