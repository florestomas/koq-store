import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { TRANSFERS } from '../../mocks/transfer.mock';
import { TRANSFER_DETAILS } from '../../mocks/transfer-details.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { COLORS } from '../../mocks/colors.mock';
import { LOCATIONS } from '../../mocks/location.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { Transfer } from '../../interfaces/transfer';

export interface DetailRow {
  detailId: string;
  productId: string;
  modelName: string;
  size: string;
  colorName: string;
  quantitySent: number;
}

export interface ReceptionRow {
  id: string;
  dateTime: string;
  originLocationName: string;
  destinationLocationName: string;
  itemCount: number;
  details: DetailRow[];
}

@Injectable({ providedIn: 'root' })
export class ReceptionService {
  private readonly authService = inject(AuthService);
  private readonly refreshCounter = signal(0);

  readonly pendingTransfers = computed<ReceptionRow[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;

    let transfers = TRANSFERS.filter((t) => t.status === 'pending');

    if (!isAdmin && userLocationId) {
      transfers = transfers.filter(
        (t) => t.idDestination === userLocationId,
      );
    }

    transfers.sort(
      (a, b) =>
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );

    return transfers.map((t) => {
      const origin = LOCATIONS.find((l) => l.id === t.idOrigin);
      const destination = LOCATIONS.find(
        (l) => l.id === t.idDestination,
      );

      const details: DetailRow[] = TRANSFER_DETAILS.filter(
        (d) => d.idTransfer === t.id,
      ).map((d) => {
        const product = PRODUCTS.find((p) => p.id === d.idProduct);
        const model = product
          ? CLOTHING_MODELS.find(
              (m) => m.id === product.idClothingModel,
            )
          : undefined;
        const color = product
          ? COLORS.find((c) => c.id === product.idColor)
          : undefined;

        return {
          detailId: d.id,
          productId: d.idProduct,
          modelName: model?.name ?? 'Producto',
          size: product?.size ?? '',
          colorName: color?.name ?? '',
          quantitySent: d.quantity,
        };
      });

      return {
        id: t.id,
        dateTime: t.dateTime,
        originLocationName: origin?.name ?? 'Desconocido',
        destinationLocationName: destination?.name ?? 'Desconocido',
        itemCount: details.length,
        details,
      };
    });
  });

  confirmReception(
    transferId: string,
    receivedMap: Record<string, number>,
  ): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    const transfer = TRANSFERS.find((t) => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') return false;

    const userLocationId = user.idLocation;

    const details = TRANSFER_DETAILS.filter(
      (d) => d.idTransfer === transferId,
    );

    for (const detail of details) {
      const receivedQty = receivedMap[detail.idProduct] ?? detail.quantity;
      detail.quantityReceived = receivedQty;

      if (receivedQty > 0) {
        const stockRecord = STOCK_LOCATIONS.find(
          (s) =>
            s.idProduct === detail.idProduct &&
            s.idLocation === userLocationId,
        );
        if (stockRecord) {
          stockRecord.currentStock += receivedQty;
        } else {
          const nextId = String(
            Math.max(
              ...STOCK_LOCATIONS.map((s) => parseInt(s.id)),
              0,
            ) + 1,
          );
          STOCK_LOCATIONS.push({
            id: nextId,
            idProduct: detail.idProduct,
            idLocation: userLocationId,
            currentStock: receivedQty,
            minimumStock: 1,
          });
        }
      }
    }

    transfer.status = 'confirmed';
    transfer.confirmedAt = new Date().toISOString();
    transfer.idUserDestination = user.id;

    this.refresh();
    return true;
  }

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
  }
}
