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

    const normalItems = items.filter((item) => item.productId !== '');
    const canastoItems = items.filter((item) => item.productId === '');

    try {
      const saleId = crypto.randomUUID();
      const supabase = getSupabase();

      if (normalItems.length > 0) {
        const p_items = normalItems.map((item) => ({
          id_product: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          original_price: item.originalPrice,
        }));

        const { error } = await supabase.rpc('confirmar_venta', {
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
      } else {
        const { error: saleError } = await supabase.from('sales').insert({
          id: saleId,
          date_time: new Date().toISOString(),
          id_location: idLocation,
          id_user: idUser,
          channel,
          discount_type: null,
          discount_value: null,
          status: 'active',
        });

        if (saleError) {
          console.error('Sale insert error:', saleError);
          return false;
        }
      }

      if (canastoItems.length > 0) {
        const canastoDetails = canastoItems.map((item) => ({
          id_sale: saleId,
          id_product: null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          original_price: item.originalPrice,
        }));

        const { error: detailError } = await supabase
          .from('sale_details')
          .insert(canastoDetails);

        if (detailError) {
          console.error('Canasto detail insert error:', detailError);
          return false;
        }
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

    const normalItems = items.filter((item) => item.productId !== '');
    const canastoItems = items.filter((item) => item.productId === '');

    try {
      const newSaleId = crypto.randomUUID();
      const supabase = getSupabase();

      if (normalItems.length > 0) {
        const p_items = normalItems.map((item) => ({
          id_product: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          original_price: item.originalPrice,
        }));

        const { error } = await supabase.rpc('editar_venta', {
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
      } else {
        const cancelled = await supabase
          .from('sales')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', saleId);

        if (cancelled.error) {
          console.error('Error cancelling old sale:', cancelled.error);
          return false;
        }

        const { error: saleError } = await supabase.from('sales').insert({
          id: newSaleId,
          date_time: new Date().toISOString(),
          id_location: idLocation,
          id_user: idUser,
          channel,
          discount_type: null,
          discount_value: null,
          status: 'active',
        });

        if (saleError) {
          console.error('Sale insert error:', saleError);
          return false;
        }
      }

      if (canastoItems.length > 0) {
        const canastoDetails = canastoItems.map((item) => ({
          id_sale: newSaleId,
          id_product: null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          original_price: item.originalPrice,
        }));

        const { error: detailError } = await supabase
          .from('sale_details')
          .insert(canastoDetails);

        if (detailError) {
          console.error('Canasto detail insert error:', detailError);
          return false;
        }
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
