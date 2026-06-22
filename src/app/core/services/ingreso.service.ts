import { computed, Injectable, signal } from '@angular/core';
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
  private static readonly LAST_CACHE_KEY = 'koq-ingreso-last';

  private lastIngresoData = signal<{ items: IngresoItem[]; locationId: string } | null>(null);
  readonly hasLastIngreso = computed(() => this.lastIngresoData() !== null);

  constructor() {
    this.restoreLastIngreso();
  }

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
    const noopOldRef = crypto.randomUUID();

    try {
      const p_items = items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          id_product: item.productId,
          quantity: item.quantity,
        }));

      if (p_items.length === 0) return false;

      const { error } = await supabase.rpc('editar_ingreso', {
        p_old_reference_id: noopOldRef,
        p_new_reference_id: refId,
        p_id_location: idLocation,
        p_items,
      });

      if (error) {
        console.error('Ingreso RPC error:', error.message, error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in confirmIngreso:', err);
      return false;
    }
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

  saveLastIngreso(items: IngresoItem[], locationId: string): void {
    if (items.length === 0) return;
    const data = { items: items.map((i) => ({ ...i })), locationId };
    this.lastIngresoData.set(data);
    sessionStorage.setItem(IngresoService.LAST_CACHE_KEY, JSON.stringify(data));
  }

  repeatLastIngreso(): { items: IngresoItem[]; locationId: string } | null {
    const data = this.lastIngresoData();
    if (!data) return null;
    return { items: data.items.map((i) => ({ ...i })), locationId: data.locationId };
  }

  private restoreLastIngreso(): void {
    const raw = sessionStorage.getItem(IngresoService.LAST_CACHE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.items) && data.items.length > 0 && data.locationId) {
        this.lastIngresoData.set(data);
      } else {
        sessionStorage.removeItem(IngresoService.LAST_CACHE_KEY);
      }
    } catch {
      sessionStorage.removeItem(IngresoService.LAST_CACHE_KEY);
    }
  }
}
