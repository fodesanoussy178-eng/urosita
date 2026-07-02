import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { signOut } from '@/features/auth/authService';
import { theme } from '@/components/ui/theme';
import { Button } from '@/components/ui/Button';

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? '#fff' : '#9fb2c9',
  fontWeight: 600,
  fontSize: 14,
});

export function DashboardLayout() {
  const { session, profile } = useAuth();

  return (
    <div style={theme.page}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ textAlign: 'center' }}>
          <span style={theme.badge}>
            {profile?.full_name || session?.user.email}
            {profile?.role ? ` - ${profile.role === 'worker' ? 'Travailleur' : 'Structure'}` : ''}
          </span>
          <h1 style={theme.title}>Bienvenue sur Urosi-t</h1>
          <p style={theme.sub}>Ton compte est connecte a la base.</p>
        </div>

        <nav style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 8 }}>
          <NavLink to="/dashboard" style={navLinkStyle}>
            {profile?.role === 'structure_admin' ? 'Mes missions' : 'Missions'}
          </NavLink>
          <NavLink to="/profile" style={navLinkStyle}>
            Profil
          </NavLink>
        </nav>

        <Outlet />

        <div style={{ textAlign: 'center' }}>
          <Button variant="secondary" style={{ maxWidth: 200 }} onClick={() => signOut()}>
            Se deconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
