import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { TRANSFERS } from '../../mocks/transfer.mock';
import { TRANSFER_DETAILS } from '../../mocks/transfer-details.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { COLORS } from '../../mocks/colors.mock';
import { LOCATIONS } from '../../mocks/location.mock';

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
  details: TransferDetailRow[];
}

@Injectable({ providedIn: 'root' })
export class TransferHistoryService {
  private readonly authService = inject(AuthService);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly locationId = signal<string | null>(null);
  readonly statusFilter = signal<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  private readonly refreshCounter = signal(0);

  readonly filteredTransfers = computed<TransferRow[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const locId = this.locationId();
    const st = this.statusFilter();

    let transfers = TRANSFERS;

    if (!isAdmin && userLocationId) {
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
      const details: TransferDetailRow[] = TRANSFER_DETAILS.filter(
        (d) => d.idTransfer === t.id,
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
        };
      });

      return {
        id: t.id,
        dateTime: t.dateTime,
        originName: LOCATIONS.find((l) => l.id === t.idOrigin)?.name ?? 'Desconocido',
        destinationName: LOCATIONS.find((l) => l.id === t.idDestination)?.name ?? 'Desconocido',
        originId: t.idOrigin,
        destinationId: t.idDestination,
        status: t.status,
        confirmedAt: t.confirmedAt,
        itemCount: details.length,
        details,
      };
    });

    result.sort(
      (a, b) =>
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );

    return result;
  });

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
  }
}
