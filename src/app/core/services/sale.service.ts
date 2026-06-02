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
  imageUrl: string;
}

interface ConfirmSaleParams {
  items: CartItem[];
  idLocation: string;
  idUser: string;
  channel: 'local' | 'whatsapp';
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
}

@Injectable({ providedIn: 'root' })
export class SaleService {
  private readonly catalogService = inject(CatalogService);

  async confirmSale(data: ConfirmSaleParams): Promise<boolean> {
    const { items, idLocation, idUser, channel, discountType, discountValue } = data;
    if (items.length === 0 || !channel) return false;

    try {
      const p_items = items.map((item) => ({
        id_product: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error } = await getSupabase().rpc('confirmar_venta', {
        p_id: crypto.randomUUID(),
        p_id_location: idLocation,
        p_id_user: idUser,
        p_channel: channel,
        p_discount_type: discountType ?? null,
        p_discount_value: discountValue ?? null,
        p_note: null,
        p_items,
      });

      if (error) {
        console.error('Sale error:', error);
        return false;
      }

      this.catalogService.triggerRefresh();
      return true;
    } catch (err) {
      console.error('Sale error:', err);
      return false;
    }
  }
}
