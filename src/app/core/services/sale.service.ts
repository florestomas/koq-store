import { inject } from '@angular/core';
import { Injectable } from '@angular/core';
import { getSupabase } from './supabase.service';
import { CatalogService } from './catalog.service';

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

      this.catalogService.triggerRefresh();
      return true;
    } catch (err) {
      console.error('Sale error:', err);
      return false;
    }
  }
}
