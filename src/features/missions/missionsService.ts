import { supabase } from '@/lib/supabase';
import type { Mission, MissionInsert } from './types';

const MISSION_COLUMNS = 'id, structure_id, title, detail, city, scheduled_date, duration_minutes, worker_rate_cents, status, created_at';

export async function fetchOpenMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_COLUMNS)
    .eq('status', 'open')
    .order('scheduled_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMissionsForStructure(structureId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_COLUMNS)
    .eq('structure_id', structureId)
    .order('scheduled_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMission(input: MissionInsert): Promise<Mission> {
  const { data, error } = await supabase.from('missions').insert(input).select(MISSION_COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function closeMission(missionId: string): Promise<void> {
  const { error } = await supabase.from('missions').update({ status: 'closed' }).eq('id', missionId);
  if (error) throw error;
}
