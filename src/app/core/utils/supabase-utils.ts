import { getSupabase } from '../services/supabase.service';

export function toCamelCase<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      value,
    ]),
  ) as T;
}

export async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const supabase = getSupabase();
  const pageSize = 1000;
  const allRows: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    if (data.length < pageSize) break;

    from += pageSize;
  }

  return allRows;
}
