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

export interface IngresoGroupData {
  referenceId: string;
  locationId: string;
  items: { productId: string; quantity: number }[];
}

@Injectable({ providedIn: 'root' })
export class IngresoService {
  async loadIngresoForEditing(referenceId: string): Promise<IngresoGroupData | null> {
    try {
      const supabase = getSupabase();
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('reference_type', 'ingreso')
        .eq('reference_id', referenceId);

      if (!movements || movements.length === 0) return null;

      return {
        referenceId,
        locationId: movements[0].id_location,
        items: movements.map((m) => ({
          productId: m.id_product,
          quantity: m.quantity,
        })),
      };
    } catch (err) {
      console.error('Error loading ingreso for editing:', err);
      return null;
    }
  }

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

  async editIngreso(
    oldReferenceId: string,
    items: IngresoItem[],
    idLocation: string,
  ): Promise<boolean> {
    if (items.length === 0 || !idLocation) return false;

    const supabase = getSupabase();
    const newRefId = crypto.randomUUID();

    try {
      const p_items = items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          id_product: item.productId,
          quantity: item.quantity,
        }));

      if (p_items.length === 0) return false;

      const { error } = await supabase.rpc('editar_ingreso', {
        p_old_reference_id: oldReferenceId,
        p_new_reference_id: newRefId,
        p_id_location: idLocation,
        p_items,
      });

      if (error) {
        console.error('Edit ingreso error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in editIngreso:', err);
      return false;
    }
  }
}
