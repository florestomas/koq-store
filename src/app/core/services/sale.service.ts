import { computed, inject, Injectable, signal } from '@angular/core';
import { CatalogService } from './catalog.service';
import { getSupabase } from './supabase.service';

export interface CartItem {
  productId: string;
  modelName: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  imageUrl: string;
}

interface ConfirmSaleParams {
  items: CartItem[];
  idLocation: string;
  idUser: string;
  channel: 'local' | 'whatsapp';
}

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly catalogService = inject(CatalogService);

  private lastSaleData = signal<{ items: CartItem[]; channel: 'local' | 'whatsapp' } | null>(null);
  readonly hasLastSale = computed(() => this.lastSaleData() !== null);

  async confirmSale(data: ConfirmSaleParams): Promise<boolean> {
    const { items, idLocation, idUser, channel } = data;
    if (items.length === 0 || !channel) return false;

    try {
      const saleId = crypto.randomUUID();
      const p_items = items.map((item) => ({
        id_product: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error } = await getSupabase().rpc('confirmar_venta', {
        p_id: saleId,
        p_id_location: idLocation,
        p_id_user: idUser,
        p_channel: channel,
        p_discount_type: null,
        p_discount_value: null,
        p_note: null,
        p_items,
      });

      if (error) {
        console.error('Sale error:', error);
        return false;
      }

      this.saveLastSale(data);
      this.catalogService.triggerRefresh();
      return true;
    } catch (err) {
      console.error('Sale error:', err);
      return false;
    }
  }

  async editSale(saleId: string, data: ConfirmSaleParams): Promise<boolean> {
    const { items, idLocation, idUser, channel } = data;
    if (items.length === 0 || !channel) return false;

    try {
      const newSaleId = crypto.randomUUID();
      const p_items = items.map((item) => ({
        id_product: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error } = await getSupabase().rpc('editar_venta', {
        p_old_sale_id: saleId,
        p_id: newSaleId,
        p_id_location: idLocation,
        p_id_user: idUser,
        p_channel: channel,
        p_items,
      });

      if (error) {
        console.error('Edit sale error:', error);
        return false;
      }

      this.saveLastSale(data);
      this.catalogService.triggerRefresh();
      return true;
    } catch (err) {
      console.error('Edit sale error:', err);
      return false;
    }
  }

  private saveLastSale(data: ConfirmSaleParams): void {
    const { items, channel } = data;
    if (items.length === 0) return;
    this.lastSaleData.set({ items: items.map((i) => ({ ...i })), channel });
  }

  repeatLastSale(): { items: CartItem[]; channel: 'local' | 'whatsapp' } | null {
    const data = this.lastSaleData();
    if (!data) return null;
    return { items: data.items.map((i) => ({ ...i })), channel: data.channel };
  }
}
