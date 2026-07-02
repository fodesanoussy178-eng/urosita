import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissionCard } from './MissionCard';
import type { Mission } from './types';

const mission: Mission = {
  id: '1',
  structure_id: 's1',
  title: 'Aide evenementielle',
  detail: 'Accueil du public',
  city: 'Lille',
  scheduled_date: '2026-08-01',
  duration_minutes: 240,
  worker_rate_cents: 6800,
  status: 'open',
  created_at: '2026-07-01T00:00:00Z',
};

describe('MissionCard', () => {
  it('renders mission details with formatted duration and rate', () => {
    render(<MissionCard mission={mission} />);
    expect(screen.getByText('Aide evenementielle')).toBeInTheDocument();
    expect(screen.getByText('Accueil du public')).toBeInTheDocument();
    expect(screen.getByText(/Lille - 2026-08-01 - 4 h - 68.00 EUR net/)).toBeInTheDocument();
  });

  it('renders the provided action slot', () => {
    render(<MissionCard mission={mission} action={<button>Postuler</button>} />);
    expect(screen.getByRole('button', { name: 'Postuler' })).toBeInTheDocument();
  });
});
