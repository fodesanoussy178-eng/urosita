import { supabase } from '@/lib/supabase';
import type { Database, ApplicationStatus } from '@/types/database.types';
import type { Mission } from './types';

export type Application = Database['public']['Tables']['applications']['Row'];

export interface ApplicationWithMission extends Application {
  mission: Pick<Mission, 'id' | 'title' | 'city' | 'scheduled_date' | 'status'> | null;
}

export interface ApplicationWithApplicant extends Application {
  profile: { full_name: string } | null;
}

export async function applyToMission(missionId: string, workerId: string): Promise<void> {
  const { error } = await supabase.from('applications').insert({ mission_id: missionId, worker_id: workerId });
  if (error) throw error;
}

export async function fetchMyApplications(workerId: string): Promise<ApplicationWithMission[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, mission:missions(id, title, city, scheduled_date, status)')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ApplicationWithMission[];
}

export async function fetchApplicationsForMission(missionId: string): Promise<ApplicationWithApplicant[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, profile:profiles(full_name)')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ApplicationWithApplicant[];
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void> {
  const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);
  if (error) throw error;
}
