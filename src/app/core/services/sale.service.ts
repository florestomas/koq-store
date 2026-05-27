import { Injectable } from '@angular/core';
import { SALES } from '../../mocks/sales.mock';
import { SALE_DETAILS } from '../../mocks/sale-detail.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';

export interface CartItem {
  productId: string;
  modelName: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface ConfirmSaleData {
  items: CartItem[];
  idLocation: string;
  idUser: string;
  channel: 'local' | 'whatsapp' | 'mercadolibre';
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
}

@Injectable({ providedIn: 'root' })
export class SaleService {
  confirmSale(data: ConfirmSaleData): boolean {
    const { items, idLocation, idUser, channel, discountType, discountValue } = data;

    if (items.length === 0) return false;
    if (!channel) return false;

    const nextSaleId = String(Math.max(...SALES.map((s) => parseInt(s.id)), 0) + 1);

    SALES.push({
      id: nextSaleId,
      dateTime: new Date().toISOString(),
      idLocation,
      idUser,
      channel,
      discountType: discountType ?? undefined,
      discountValue: discountType ? discountValue : undefined,
      status: 'active',
    });

    for (const item of items) {
      const nextDetailId = String(
        Math.max(...SALE_DETAILS.map((d) => parseInt(d.id)), 0) + 1,
      );

      SALE_DETAILS.push({
        id: nextDetailId,
        idSale: nextSaleId,
        idProduct: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });

      const stockRecord = STOCK_LOCATIONS.find(
        (s) => s.idProduct === item.productId && s.idLocation === idLocation,
      );
      if (stockRecord) {
        stockRecord.currentStock = Math.max(0, stockRecord.currentStock - item.quantity);
      }
    }

    return true;
  }
}
