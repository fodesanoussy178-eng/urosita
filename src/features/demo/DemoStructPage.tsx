import { T, FONT } from '@/components/ui/theme';
import { Stars } from '@/components/ui/Stars';
import { SINFO } from './demoData';

// Placeholder « photo du lieu » : dégradé teinté + nom en filigrane.
export function Venue({ name, hue, h = 150, rounded = 0 }: { name: string; hue: number; h?: number; rounded?: number }) {
  return (
    <div style={{ position: 'relative', height: h, borderRadius: rounded, overflow: 'hidden', background: `linear-gradient(155deg, hsl(${hue} 26% 24%), hsl(${hue} 42% 8%))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 0%, transparent 45%, rgba(0,0,0,.5))' }} />
      <div style={{ fontSize: h > 250 ? 30 : 13, fontWeight: 900, letterSpacing: 2, color: '#ffffff16', textTransform: 'uppercase', textAlign: 'center', padding: '0 18px' }}>{name}</div>
    </div>
  );
}

// Fiche structure de la démo (données fictives SINFO).
export function DemoStructPage({ name, onBack }: { name: string; onBack: () => void }) {
  const s = SINFO[name];
  if (!s) return null;
  const classe = s.note != null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 60, overflowY: 'auto', fontFamily: FONT }}>
      <div style={{ position: 'relative' }}>
        <Venue name={name} hue={s.hue} h={190} />
        <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>‹</button>
      </div>
      <div style={{ padding: '0 16px 26px', marginTop: -30, position: 'relative', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `hsl(${s.hue} 30% 14%)`, border: `2px solid hsl(${s.hue} 30% 26%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15, flexShrink: 0 }}>
            {name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1, paddingBottom: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.text }}>{name}</div>
              {s.verif && <span style={{ fontSize: 9, fontWeight: 800, color: '#22c55e', background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap' }}>✓ VÉRIFIÉE</span>}
            </div>
            {classe ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Stars n={s.note ?? 0} size={12} />
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{String(s.note).replace('.', ',')}</span>
                <span style={{ fontSize: 11, color: T.mu }}>({s.avis} avis)</span>
              </div>
            ) : (
              <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: T.cyan, background: '#22d3ee15', borderRadius: 8, padding: '2px 7px', marginTop: 4 }}>Nouvelle · pas encore classée</span>
            )}
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: s.ess ? T.green : T.cyan, background: s.ess ? T.greenBg : '#22d3ee15', border: `1px solid ${s.ess ? '#14532d' : '#0e7490'}`, borderRadius: 20, padding: '3px 10px' }}>
            {s.ess ? '🤝 ' : '🏢 '}
            {s.type}
          </span>
        </div>
        <div style={{ fontSize: 11, color: T.mu, marginBottom: 15 }}>SIRET {s.siret} ⓘ</div>

        {classe && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: T.card, border: `1px solid ${T.cb}`, borderRadius: 13, padding: '13px 0', marginBottom: 16 }}>
            {([[String(s.pubs), 'missions publiées'], [`${s.presence} %`, 'taux de présence'], [s.repw ?? '—', 'temps de réponse']] as [string, string][]).map(([v, l], i) => (
              <div key={l} style={{ textAlign: 'center', borderRight: i < 2 ? `1px solid ${T.cb}` : 'none', padding: '0 6px' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{v}</div>
                <div style={{ fontSize: 8.5, color: T.mu, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingBottom: 15, marginBottom: 15, borderBottom: `1px solid ${T.cb}` }}>
          {([['📍', s.adr], ['🚇', s.metro], ['🕒', s.horaires]] as [string, string][]).map(([ic, txt]) => (
            <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: T.sub }}>
              <span>{ic}</span>
              {txt}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 9 }}>Photos du lieu</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <Venue key={i} name={name} hue={s.hue} h={58} rounded={9} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 6 }}>À propos</div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>{s.apropos}</div>
        </div>

        {s.avisList.length > 0 ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 9 }}>Avis récents</div>
            {s.avisList.map((a, i) => (
              <div key={a[0]} style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: '11px 13px', marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${i * 90 + 40} 45% 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>{a[0].charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>{a[0]}</div>
                      <div style={{ fontSize: 9, color: T.mu }}>{a[1]}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Stars n={a[2]} size={10} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.text }}>{String(a[2]).replace('.', ',')}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.5 }}>{a[3]}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.cb}`, borderRadius: 12, padding: 16, textAlign: 'center', fontSize: 11, color: T.mu }}>
            Nouvelle structure — pas encore d'avis. Elle sera classée après ses premières missions.
          </div>
        )}
      </div>
    </div>
  );
}
