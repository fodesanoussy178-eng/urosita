import { supabase } from '@/lib/supabase';

export interface StructureRating {
  average: number;
  count: number;
}

export async function rateStructure(input: {
  applicationId: string;
  structureId: string;
  workerId: string;
  score: number;
}): Promise<void> {
  const { error } = await supabase.from('ratings').insert({
    application_id: input.applicationId,
    structure_id: input.structureId,
    worker_id: input.workerId,
    score: input.score,
  });
  if (error) throw error;
}

export async function fetchStructureRatings(structureIds: string[]): Promise<Map<string, StructureRating>> {
  if (structureIds.length === 0) return new Map();
  const { data, error } = await supabase.from('ratings').select('structure_id, score').in('structure_id', structureIds);
  if (error) throw error;
  const map = new Map<string, StructureRating>();
  for (const row of data ?? []) {
    const entry = map.get(row.structure_id) ?? { average: 0, count: 0 };
    entry.average = (entry.average * entry.count + row.score) / (entry.count + 1);
    entry.count += 1;
    map.set(row.structure_id, entry);
  }
  return map;
}

export async function fetchMyRatings(workerId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('ratings').select('application_id, score').eq('worker_id', workerId);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.application_id, r.score]));
}
