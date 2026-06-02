import { Injectable } from '@angular/core';
import { getSupabase } from './supabase.service';

export interface IngresoItem {
  productId: string;
  modelName: string;
  colorName: string;
  size: string;
  quantity: number;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class IngresoService {
  async confirmIngreso(items: IngresoItem[], idLocation: string): Promise<boolean> {
    if (items.length === 0 || !idLocation) return false;

    const supabase = getSupabase();
    const refId = crypto.randomUUID();
    const now = new Date().toISOString();

    for (const item of items) {
      if (item.quantity <= 0) continue;

      const { data: existing } = await supabase
        .from('stock_locations')
        .select('*')
        .eq('id_product', item.productId)
        .eq('id_location', idLocation)
        .single();

      if (existing) {
        const { error: updError } = await supabase
          .from('stock_locations')
          .update({ current_stock: existing.current_stock + item.quantity })
          .eq('id', existing.id);

        if (updError) {
          console.error('Error updating stock:', updError);
          return false;
        }
      } else {
        const { error: insError } = await supabase
          .from('stock_locations')
          .insert({
            id: crypto.randomUUID(),
            id_product: item.productId,
            id_location: idLocation,
            current_stock: item.quantity,
            minimum_stock: 1,
          });

        if (insError) {
          console.error('Error inserting stock:', insError);
          return false;
        }
      }

      const { error: movError } = await supabase
        .from('stock_movements')
        .insert({
          id: crypto.randomUUID(),
          date_time: now,
          id_product: item.productId,
          id_location: idLocation,
          type: 'in',
          quantity: item.quantity,
          reference_type: 'ingreso',
          reference_id: refId,
        });

      if (movError) {
        console.error('Error logging movement:', movError);
        return false;
      }
    }

    return true;
  }
}
