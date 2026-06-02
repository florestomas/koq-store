import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { StockMovementService } from './stock-movement.service';
import { getSupabase } from './supabase.service';
import { toCamelCase } from '../utils/supabase-utils';
import { Sale } from '../../interfaces/sale';
import { SaleDetail } from '../../interfaces/sale-detail';

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
  private readonly catalog = inject(CatalogService);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly channel = signal<'all' | 'local' | 'whatsapp'>('all');
  readonly locationId = signal<string | null>(null);
  private readonly refreshCounter = signal(0);

  get availableLocations() { return this.catalog.locations(); }

  private readonly salesSig = signal<Sale[]>([]);
  private readonly saleDetailsSig = signal<SaleDetail[]>([]);

  readonly filteredSales = computed<SaleRow[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = this.authService.isAdmin();
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const ch = this.channel();
    const locId = this.locationId();

    const allProducts = this.catalog.catalogProducts();
    const allModels = this.catalog.catalogModels();
    const allColors = this.catalog.colors();
    const allUsers = this.catalog.users();

    let sales = this.salesSig();

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
      const userObj = allUsers.find((u) => u.id === sale.idUser);
      const operatorName = userObj?.user ?? 'Desconocido';

      const details: SaleDetailRow[] = this.saleDetailsSig()
        .filter((d) => d.idSale === sale.id)
        .map((d) => {
          const product = allProducts.find((p) => p.id === d.idProduct);
          const model = product
            ? allModels.find((m) => m.id === product.idClothingModel)
            : undefined;
          const color = product
            ? allColors.find((c) => c.id === product.idColor)
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

    const groups: Record<string, TopProduct> = {};

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

  constructor() {
    this.authService.waitForInit().then(() => this.loadSales());
  }

  private async loadSales(): Promise<void> {
    try {
      const supabase = getSupabase();
      const [{ data: sales }, { data: details }] = await Promise.all([
        supabase.from('sales').select('*'),
        supabase.from('sale_details').select('*'),
      ]);
      if (sales) this.salesSig.set(sales.map((r: Record<string, unknown>) => toCamelCase<Sale>(r)));
      if (details) this.saleDetailsSig.set(details.map((r: Record<string, unknown>) => toCamelCase<SaleDetail>(r)));
    } catch (err) {
      console.error('Error loading sales:', err);
    }
  }

  async cancelSale(saleId: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const sale = this.salesSig().find((s) => s.id === saleId);
      if (!sale || sale.status !== 'active') return false;

      const { error: updateError } = await supabase
        .from('sales')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', saleId);

      if (updateError) {
        console.error('Error cancelling sale:', updateError);
        return false;
      }

      const details = this.saleDetailsSig().filter((d) => d.idSale === saleId);

      for (const detail of details) {
        const { data: stockRows } = await supabase
          .from('stock_locations')
          .select('*')
          .eq('id_product', detail.idProduct)
          .eq('id_location', sale.idLocation);

        if (stockRows && stockRows.length > 0) {
          const stock = stockRows[0];
          await supabase
            .from('stock_locations')
            .update({ current_stock: stock.current_stock + detail.quantity })
            .eq('id', stock.id);
        }

        await this.stockMovementService.logMovement(
          'in',
          detail.idProduct,
          sale.idLocation,
          detail.quantity,
          'sale',
          saleId,
        );
      }

      this.refresh();
      return true;
    } catch (err) {
      console.error('Error in cancelSale:', err);
      return false;
    }
  }

  async hardDeleteSale(saleId: string): Promise<boolean> {
    if (!window.confirm('¿Eliminar esta venta definitivamente? Esta acción no se puede deshacer.')) return false;
    try {
      const supabase = getSupabase();
      const sale = this.salesSig().find((s) => s.id === saleId);
      const details = this.saleDetailsSig().filter((d) => d.idSale === saleId);
      const productIds = details.map((d) => d.idProduct);

      if (productIds.length > 0) {
        if (sale) {
          for (const detail of details) {
            const { data: stockRows } = await supabase
              .from('stock_locations')
              .select('*')
              .eq('id_product', detail.idProduct)
              .eq('id_location', sale.idLocation);

            if (stockRows && stockRows.length > 0) {
              const stock = stockRows[0];
              await supabase
                .from('stock_locations')
                .update({
                  current_stock: stock['current_stock'] + detail.quantity,
                })
                .eq('id', stock['id']);
            }
          }
        }

        await supabase.from('stock_movements').delete().eq('reference_type', 'sale').eq('reference_id', saleId);
        await supabase.from('sale_details').delete().eq('id_sale', saleId);
      }

      await supabase.from('sales').delete().eq('id', saleId);
      this.refresh();
      return true;
    } catch (err) {
      console.error('Error deleting sale:', err);
      return false;
    }
  }

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
    this.loadSales();
  }
}
