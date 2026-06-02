import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { getSupabase } from './supabase.service';
import { toCamelCase } from '../utils/supabase-utils';
import { Transfer } from '../../interfaces/transfer';
import { TransferDetail } from '../../interfaces/transfer-detail';

export interface DetailRow {
  detailId: string;
  productId: string;
  modelId: string;
  modelName: string;
  size: string;
  colorId: string;
  colorName: string;
  quantitySent: number;
  imageUrl: string;
  stockStatus: 'critical' | 'low' | 'ok';
  productSku: string;
}

export interface ReceptionRow {
  id: string;
  dateTime: string;
  originLocationName: string;
  destinationLocationName: string;
  originLocationId: string;
  destinationLocationId: string;
  itemCount: number;
  details: DetailRow[];
}

@Injectable({ providedIn: 'root' })
export class ReceptionService {
  private readonly authService = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly refreshCounter = signal(0);

  private readonly transfersSig = signal<Transfer[]>([]);
  private readonly transferDetailsSig = signal<TransferDetail[]>([]);

  readonly pendingTransfers = computed<ReceptionRow[]>(() => {
    this.refreshCounter();
    return this.buildReceptionRows('pending');
  });

  readonly confirmedTransfers = computed<ReceptionRow[]>(() => {
    this.refreshCounter();
    return this.buildReceptionRows('confirmed');
  });

  private buildReceptionRows(status: 'pending' | 'confirmed'): ReceptionRow[] {
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;

    const allProducts = this.catalog.catalogProducts();
    const allModels = this.catalog.catalogModels();
    const allColors = this.catalog.colors();
    const allLocations = this.catalog.locations();
    const allStocks = this.catalog.catalogStocks();
    const allModelColors = this.catalog.catalogModelColors();
    const allTransfers = this.transfersSig();
    const allTransferDetails = this.transferDetailsSig();

    let transfers = allTransfers.filter((t) => t.status === status);

    if (!isAdmin && userLocationId) {
      transfers = transfers.filter(
        (t) => t.idDestination === userLocationId,
      );
    }

    transfers.sort(
      (a, b) =>
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );

    return transfers.map((t) => {
      const origin = allLocations.find((l) => l.id === t.idOrigin);
      const destination = allLocations.find(
        (l) => l.id === t.idDestination,
      );

      const details: DetailRow[] = allTransferDetails
        .filter((d) => d.idTransfer === t.id)
        .map((d) => {
          const product = allProducts.find((p) => p.id === d.idProduct);
          const model = product
            ? allModels.find((m) => m.id === product.idClothingModel)
            : undefined;
          const color = product
            ? allColors.find((c) => c.id === product.idColor)
            : undefined;

          const modelColor = product
            ? allModelColors.find(
                (mc) =>
                  mc.idClothingModel === product.idClothingModel &&
                  mc.idColor === product.idColor,
              )
            : undefined;

          const destStock = allStocks.find(
            (s) =>
              s.idProduct === d.idProduct &&
              s.idLocation === t.idDestination,
          );
          const currentStock = destStock?.currentStock ?? 0;
          const minStock = destStock?.minimumStock ?? 1;
          const stockStatus: 'critical' | 'low' | 'ok' =
            currentStock === 0
              ? 'critical'
              : currentStock <= minStock
                ? 'low'
                : 'ok';

          return {
            detailId: d.id,
            productId: d.idProduct,
            modelId: model?.id ?? '',
            modelName: model?.name ?? 'Producto',
            size: product?.size ?? '',
            colorId: color?.id ?? '',
            colorName: color?.name ?? '',
            imageUrl: modelColor?.imageUrl ?? '',
            quantitySent: d.quantity,
            stockStatus,
            productSku: `T. ${product?.size ?? ''} · ${color?.name ?? ''}`,
          };
        });

      return {
        id: t.id,
        dateTime: t.dateTime,
        originLocationName: origin?.name ?? 'Desconocido',
        destinationLocationName: destination?.name ?? 'Desconocido',
        originLocationId: t.idOrigin,
        destinationLocationId: t.idDestination,
        itemCount: details.length,
        details,
      };
    });
  }

  readonly pendingCount = computed(() => this.pendingTransfers().length);

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

  async confirmReception(
    transferId: string,
    receivedMap: Record<string, number>,
    note?: string,
  ): Promise<boolean> {
    const user = this.authService.currentUser();
    if (!user) return false;

    const details = this.transferDetailsSig().filter(
      (d) => d.idTransfer === transferId,
    );

    const p_items = details.map((d) => ({
      id_product: d.idProduct,
      quantity_received: receivedMap[d.idProduct] ?? d.quantity,
    }));

    const { error } = await getSupabase().rpc('confirmar_recepcion', {
      p_id_transfer: transferId,
      p_id_user_destination: user.id,
      p_items,
    });

    if (error) {
      console.error('Error confirming reception:', error);
      return false;
    }

    if (note) {
      await getSupabase()
        .from('transfers')
        .update({ note })
        .eq('id', transferId);
    }

    this.refresh();
    return true;
  }

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
    this.loadTransfers();
  }

  async hardDeleteTransfer(transferId: string): Promise<void> {
    const supabase = getSupabase();
    const productIds = this.transferDetailsSig()
      .filter((d) => d.idTransfer === transferId)
      .map((d) => d.idProduct);

    if (productIds.length > 0) {
      await supabase.from('stock_movements').delete().in('id_product', productIds);
    }
    await supabase.from('transfer_details').delete().eq('id_transfer', transferId);
    await supabase.from('transfers').delete().eq('id', transferId);
    this.refresh();
  }
}
