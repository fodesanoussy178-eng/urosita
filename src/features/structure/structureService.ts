import { supabase } from '@/lib/supabase';
import type { Structure } from '@/features/missions/types';

export async function fetchMyStructures(ownerId: string): Promise<Structure[]> {
  const { data, error } = await supabase.from('structures').select('*').eq('owner_id', ownerId).order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createStructure(ownerId: string, name: string, siret?: string): Promise<Structure> {
  const { data, error } = await supabase
    .from('structures')
    .insert({ owner_id: ownerId, name, siret: siret || null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
