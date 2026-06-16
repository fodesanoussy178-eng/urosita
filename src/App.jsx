import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

const ui = {
  page: { minHeight: '100vh', background: '#0f1b2d', color: '#eef2f7', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' },
  card: { width: '100%', maxWidth: 420, background: '#16243a', borderRadius: 18, padding: 28, boxShadow: '0 10px 40px rgba(0,0,0,.35)' },
  title: { fontSize: 30, fontWeight: 800, margin: '0 0 4px' },
  sub: { color: '#9fb2c9', margin: '0 0 24px', fontSize: 15 },
  label: { fontSize: 13, color: '#9fb2c9', margin: '12px 0 6px', display: 'block' },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid #2a3c58', background: '#0f1b2d', color: '#fff', fontSize: 15 },
  row: { display: 'flex', gap: 10, marginTop: 6 },
  chip: (active) => ({ flex: 1, padding: '11px', borderRadius: 999, border: '1px solid #2a3c58', background: active ? '#3b82f6' : 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer' }),
  btn: { width: '100%', marginTop: 18, padding: '13px', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  link: { marginTop: 14, background: 'none', border: 'none', color: '#9fb2c9', cursor: 'pointer', fontSize: 14, width: '100%' },
  err: { color: '#ff8a8a', fontSize: 14, marginTop: 12 },
  ok: { color: '#7ee2a8', fontSize: 14, marginTop: 12 },
  badge: { display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: '#22344f', color: '#cfe0f5', fontSize: 13, marginBottom: 16 },
  mission: { background: '#16243a', borderRadius: 14, padding: 18, marginTop: 12, textAlign: 'left' },
};

function Centered({ children }) {
  return <div style={ui.page}><div style={{ ...ui.card, marginTop: 60, textAlign: 'center' }}>{children}</div></div>;
}

function AuthForm() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('worker');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null); setInfo(null); setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } });
        if (err) throw err;
        if (!data.session) setInfo('Compte cree ! Si la confirmation email est active, verifie ta boite mail. Sinon, connecte-toi.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (e) { setError(e.message ?? 'Erreur.'); } finally { setBusy(false); }
  }

  return (
    <div style={ui.page}>
      <div style={{ ...ui.card, marginTop: 50 }}>
        <h1 style={ui.title}>Urosi-t</h1>
        <p style={ui.sub}>{mode === 'signin' ? 'Connexion a ton espace' : 'Creer ton compte'}</p>
        {mode === 'signup' && (
          <>
            <label style={ui.label}>Nom complet</label>
            <input style={ui.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ton nom" />
            <label style={ui.label}>Je suis...</label>
            <div style={ui.row}>
              <button style={ui.chip(role === 'worker')} onClick={() => setRole('worker')}>Travailleur</button>
              <button style={ui.chip(role === 'structure_admin')} onClick={() => setRole('structure_admin')}>Structure</button>
            </div>
          </>
        )}
        <label style={ui.label}>Email</label>
        <input style={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
        <label style={ui.label}>Mot de passe</label>
        <input style={ui.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
        {error && <p style={ui.err}>{error}</p>}
        {info && <p style={ui.ok}>{info}</p>}
        <button style={ui.btn} onClick={submit} disabled={busy}>{busy ? '...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}</button>
        <button style={ui.link} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}>
          {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Deja un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle();
      setProfile(prof);
      const { data: miss } = await supabase.from('missions').select('id, title, detail, city, scheduled_date, duration_minutes, worker_rate_cents').eq('status', 'open').order('scheduled_date', { ascending: true });
      setMissions(miss ?? []);
      setLoading(false);
    })();
  }, [session]);

  return (
    <div style={ui.page}>
      <div style={{ width: '100%', maxWidth: 640, textAlign: 'center' }}>
        <span style={ui.badge}>{profile?.full_name || session.user.email}{profile?.role ? ` - ${profile.role === 'worker' ? 'Travailleur' : 'Structure'}` : ''}</span>
        <h1 style={ui.title}>Bienvenue sur Urosi-t</h1>
        <p style={ui.sub}>Ton compte est connecte a la base.</p>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: 18, marginTop: 24 }}>Missions ouvertes</h2>
          {loading && <p style={ui.sub}>Chargement...</p>}
          {!loading && missions.length === 0 && <p style={ui.sub}>Aucune mission ouverte pour l'instant. Elles apparaitront ici des qu'une structure en publie.</p>}
          {missions.map((m) => (
            <div key={m.id} style={ui.mission}>
              <strong>{m.title}</strong>
              {m.detail && <p style={{ ...ui.sub, margin: '6px 0 0' }}>{m.detail}</p>}
              <p style={{ ...ui.sub, margin: '8px 0 0', fontSize: 13 }}>{m.city ? `${m.city} - ` : ''}{m.scheduled_date} - {Math.round((m.duration_minutes / 60) * 10) / 10} h - {(m.worker_rate_cents / 100).toFixed(2)} EUR net</p>
            </div>
          ))}
        </div>
        <button style={{ ...ui.btn, maxWidth: 200, background: '#22344f' }} onClick={() => supabase.auth.signOut()}>Se deconnecter</button>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session ?? null); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) return <Centered><p>Backend non configure : verifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel.</p></Centered>;
  if (loading) return <Centered><p>Chargement...</p></Centered>;
  return session ? <Dashboard session={session} /> : <AuthForm />;
}
