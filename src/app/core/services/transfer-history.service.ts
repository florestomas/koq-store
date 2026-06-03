import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { getSupabase } from './supabase.service';
import { toCamelCase } from '../utils/supabase-utils';
import { Transfer } from '../../interfaces/transfer';
import { TransferDetail } from '../../interfaces/transfer-detail';

export interface TransferDetailRow {
  modelName: string;
  size: string;
  colorName: string;
  quantity: number;
}

export interface TransferRow {
  id: string;
  dateTime: string;
  originName: string;
  destinationName: string;
  originId: string;
  destinationId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmedAt?: string;
  itemCount: number;
  totalValue: number;
  details: TransferDetailRow[];
}

@Injectable({ providedIn: 'root' })
export class TransferHistoryService {
  private readonly authService = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly locationId = signal<string | null>(null);
  readonly statusFilter = signal<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  private readonly refreshCounter = signal(0);

  private readonly transfersSig = signal<Transfer[]>([]);
  private readonly transferDetailsSig = signal<TransferDetail[]>([]);

  readonly filteredTransfers = computed<TransferRow[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = this.authService.isAdmin();
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const locId = this.locationId();
    const st = this.statusFilter();

    const allProducts = this.catalog.catalogProducts();
    const allModels = this.catalog.catalogModels();
    const allColors = this.catalog.colors();
    const allLocations = this.catalog.locations();

    let transfers = this.transfersSig();

    if (isAdmin && locId) {
      transfers = transfers.filter(
        (t) => t.idOrigin === locId || t.idDestination === locId,
      );
    } else if (!isAdmin && userLocationId) {
      transfers = transfers.filter(
        (t) => t.idOrigin === userLocationId || t.idDestination === userLocationId,
      );
    }

    if (st !== 'all') {
      transfers = transfers.filter((t) => t.status === st);
    }

    if (from) {
      transfers = transfers.filter((t) => t.dateTime >= from);
    }
    if (to) {
      transfers = transfers.filter((t) => t.dateTime <= to + 'T23:59:59.999Z');
    }

    const result: TransferRow[] = transfers.map((t) => {
      let totalValue = 0;
      const details: TransferDetailRow[] = this.transferDetailsSig()
        .filter((d) => d.idTransfer === t.id)
        .map((d) => {
          const product = allProducts.find((p) => p.id === d.idProduct);
          totalValue += d.quantity * (product?.salePrice ?? 0);
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
          };
        });

      return {
        id: t.id,
        dateTime: t.dateTime,
        originName: allLocations.find((l) => l.id === t.idOrigin)?.name ?? 'Desconocido',
        destinationName: allLocations.find((l) => l.id === t.idDestination)?.name ?? 'Desconocido',
        originId: t.idOrigin,
        destinationId: t.idDestination,
        status: t.status,
        confirmedAt: t.confirmedAt,
        itemCount: details.length,
        totalValue,
        details,
      };
    });

    result.sort(
      (a, b) =>
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );

    return result;
  });

  constructor() {
    this.authService.waitForInit().then(() => this.loadTransfers());
  }

  private async loadTransfers(): Promise<void> {
    try {
      const supabase = getSupabase();
      const [{ data: transfers }, { data: details }] = await Promise.all([
        supabase.from('transfers').select('*'),
        supabase.from('transfer_details').select('*'),
      ]);
      if (transfers) this.transfersSig.set(transfers.map((r: Record<string, unknown>) => toCamelCase<Transfer>(r)));
      if (details) this.transferDetailsSig.set(details.map((r: Record<string, unknown>) => toCamelCase<TransferDetail>(r)));
    } catch (err) {
      console.error('Error loading transfers:', err);
    }
  }

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
    this.loadTransfers();
  }

  async hardDeleteTransfer(transferId: string): Promise<boolean> {
    if (!window.confirm('¿Eliminar esta transferencia definitivamente? Esta acción no se puede deshacer.')) return false;
    try {
      const supabase = getSupabase();
      const details = this.transferDetailsSig().filter((d) => d.idTransfer === transferId);
      const productIds = details.map((d) => d.idProduct);

      if (productIds.length > 0) {
        await supabase
          .from('stock_movements')
          .delete()
          .eq('reference_type', 'transfer')
          .eq('reference_id', transferId);

        const { data: stockRows } = await supabase
          .from('stock_locations')
          .select('*')
          .in('id_product', productIds);

        const transferData = this.transfersSig().find((t) => t.id === transferId);
        const originId = transferData?.idOrigin;

        if (stockRows && originId) {
          for (const detail of details) {
            const stock = stockRows.find(
              (s: Record<string, unknown>) =>
                s['id_product'] === detail.idProduct && s['id_location'] === originId,
            );
            if (stock) {
              await supabase
                .from('stock_locations')
                .update({
                  current_stock: (stock as Record<string, number>)['current_stock'] + detail.quantity,
                })
                .eq('id', (stock as Record<string, unknown>)['id']);
            }
          }
        }

        await supabase.from('transfer_details').delete().eq('id_transfer', transferId);
      }

      await supabase.from('transfers').delete().eq('id', transferId);
      this.refresh();
      return true;
    } catch (err) {
      console.error('Error deleting transfer:', err);
      return false;
    }
  }
}
