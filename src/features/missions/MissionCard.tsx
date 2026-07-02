import type { ReactNode } from 'react';
import { theme } from '@/components/ui/theme';
import { formatEuros, formatHours } from '@/lib/format';
import type { Mission } from './types';

interface MissionCardProps {
  mission: Mission;
  action?: ReactNode;
}

export function MissionCard({ mission, action }: MissionCardProps) {
  return (
    <div style={theme.mission}>
      <strong>{mission.title}</strong>
      {mission.detail && <p style={{ ...theme.sub, margin: '6px 0 0' }}>{mission.detail}</p>}
      <p style={{ ...theme.sub, margin: '8px 0 0', fontSize: 13 }}>
        {mission.city ? `${mission.city} - ` : ''}
        {mission.scheduled_date} - {formatHours(mission.duration_minutes)} - {formatEuros(mission.worker_rate_cents)} net
      </p>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
