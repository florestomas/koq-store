import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SALES } from '../../mocks/sales.mock';
import { SALE_DETAILS } from '../../mocks/sale-detail.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { COLORS } from '../../mocks/colors.mock';
import { USERS } from '../../mocks/users.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { LOCATIONS } from '../../mocks/location.mock';
import { StockMovementService } from './stock-movement.service';

export interface SaleDetailRow {
  modelName: string;
  size: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  productId: string;
}

export interface SaleRow {
  id: string;
  dateTime: string;
  operatorName: string;
  channel: 'local' | 'whatsapp';
  totalBeforeDiscount: number;
  discountType?: 'percentage' | 'fixed_amount' | 'none';
  discountValue?: number;
  totalAmount: number;
  status: 'active' | 'cancelled';
  cancelledAt?: string;
  idLocation: string;
  details: SaleDetailRow[];
}

export interface TopProduct {
  modelName: string;
  size: string;
  colorName: string;
  totalQuantity: number;
}

@Injectable({ providedIn: 'root' })
export class SalesHistoryService {
  private readonly authService = inject(AuthService);
  private readonly stockMovementService = inject(StockMovementService);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly channel = signal<'all' | 'local' | 'whatsapp'>('all');
  readonly locationId = signal<string | null>(null);
  private readonly refreshCounter = signal(0);

  readonly availableLocations = LOCATIONS;

  readonly filteredSales = computed<SaleRow[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const ch = this.channel();
    const locId = this.locationId();

    let sales = SALES;

    if (isAdmin && locId) {
      sales = sales.filter((s) => s.idLocation === locId);
    } else if (!isAdmin && userLocationId) {
      sales = sales.filter((s) => s.idLocation === userLocationId);
    }

    if (ch !== 'all') {
      sales = sales.filter((s) => s.channel === ch);
    }

    if (from) {
      sales = sales.filter((s) => s.dateTime >= from);
    }
    if (to) {
      sales = sales.filter((s) => s.dateTime <= to + 'T23:59:59.999Z');
    }

    const result: SaleRow[] = sales.map((sale) => {
      const userObj = USERS.find((u) => u.id === sale.idUser);
      const operatorName = userObj?.user ?? 'Desconocido';

      const details: SaleDetailRow[] = SALE_DETAILS.filter(
        (d) => d.idSale === sale.id,
      ).map((d) => {
        const product = PRODUCTS.find((p) => p.id === d.idProduct);
        const model = product
          ? CLOTHING_MODELS.find((m) => m.id === product.idClothingModel)
          : undefined;
        const color = product
          ? COLORS.find((c) => c.id === product.idColor)
          : undefined;

        return {
          modelName: model?.name ?? 'Producto',
          size: product?.size ?? '',
          colorName: color?.name ?? '',
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          productId: d.idProduct,
        };
      });

      const totalBefore = details.reduce(
        (sum, d) => sum + d.quantity * d.unitPrice,
        0,
      );

      let totalAmount = totalBefore;
      if (
        sale.discountType &&
        sale.discountType !== 'none' &&
        sale.discountValue
      ) {
        if (sale.discountType === 'percentage') {
          totalAmount = totalBefore - (totalBefore * sale.discountValue) / 100;
        } else {
          totalAmount = totalBefore - sale.discountValue;
        }
      }

      return {
        id: sale.id,
        dateTime: sale.dateTime,
        operatorName,
        channel: sale.channel,
        totalBeforeDiscount: totalBefore,
        discountType: sale.discountType,
        discountValue: sale.discountValue,
        totalAmount,
        status: sale.status,
        cancelledAt: sale.cancelledAt,
        idLocation: sale.idLocation,
        details,
      };
    });

    result.sort(
      (a, b) =>
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );

    return result;
  });

  readonly totalRevenue = computed(() =>
    this.filteredSales()
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + s.totalAmount, 0),
  );

  readonly topChannel = computed<{ name: string; count: number } | null>(
    () => {
      const sales = this.filteredSales();
      if (sales.length === 0) return null;

      const counts: Record<string, number> = {};
      for (const s of sales) {
        counts[s.channel] = (counts[s.channel] || 0) + 1;
      }

      let top = '';
      let maxCount = 0;
      for (const [ch, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          top = ch;
        }
      }

      return { name: top, count: maxCount };
    },
  );

  readonly topProducts = computed<TopProduct[]>(() => {
    const activeSales = this.filteredSales().filter(
      (s) => s.status === 'active',
    );

    const groups: Record<
      string,
      TopProduct
    > = {};

    for (const sale of activeSales) {
      for (const detail of sale.details) {
        const key = `${detail.modelName}|${detail.size}|${detail.colorName}`;
        if (groups[key]) {
          groups[key].totalQuantity += detail.quantity;
        } else {
          groups[key] = {
            modelName: detail.modelName,
            size: detail.size,
            colorName: detail.colorName,
            totalQuantity: detail.quantity,
          };
        }
      }
    }

    return Object.values(groups)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);
  });

  cancelSale(saleId: string): boolean {
    const sale = SALES.find((s) => s.id === saleId);
    if (!sale || sale.status !== 'active') return false;

    sale.status = 'cancelled';
    sale.cancelledAt = new Date().toISOString();

    const details = SALE_DETAILS.filter((d) => d.idSale === saleId);

    for (const detail of details) {
      const stockRecord = STOCK_LOCATIONS.find(
        (s) =>
          s.idProduct === detail.idProduct && s.idLocation === sale.idLocation,
      );
      if (stockRecord) {
        stockRecord.currentStock += detail.quantity;
      }

      this.stockMovementService.logMovement('in', detail.idProduct, sale.idLocation, detail.quantity, 'sale', saleId);
    }

    this.refresh();
    return true;
  }

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
  }
}
