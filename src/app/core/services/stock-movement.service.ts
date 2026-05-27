import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { STOCK_MOVEMENTS } from '../../mocks/stock-movements.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { COLORS } from '../../mocks/colors.mock';
import { LOCATIONS } from '../../mocks/location.mock';
import { StockMovement } from '../../interfaces/stock-movement';

export interface MovementRow {
  id: string;
  dateTime: string;
  modelName: string;
  size: string;
  colorName: string;
  locationName: string;
  type: 'in' | 'out';
  quantity: number;
  referenceType: 'sale' | 'transfer';
  referenceId: string;
}

@Injectable({ providedIn: 'root' })
export class StockMovementService {
  private readonly authService = inject(AuthService);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly locationId = signal<string | null>(null);
  readonly typeFilter = signal<'all' | 'in' | 'out'>('all');
  readonly productSearch = signal('');

  readonly filteredMovements = computed<MovementRow[]>(() => {
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const locId = this.locationId();
    const type = this.typeFilter();
    const search = this.productSearch().toLowerCase().trim();

    let movements: StockMovement[] = STOCK_MOVEMENTS;

    if (!isAdmin && userLocationId) {
      movements = movements.filter((m) => m.idLocation === userLocationId);
    }

    if (type !== 'all') {
      movements = movements.filter((m) => m.type === type);
    }

    if (from) {
      movements = movements.filter((m) => m.dateTime >= from);
    }
    if (to) {
      movements = movements.filter((m) => m.dateTime <= to + 'T23:59:59.999Z');
    }

    const result: MovementRow[] = movements.map((m) => {
      const product = PRODUCTS.find((p) => p.id === m.idProduct);
      const model = product
        ? CLOTHING_MODELS.find((x) => x.id === product.idClothingModel)
        : undefined;
      const color = product
        ? COLORS.find((c) => c.id === product.idColor)
        : undefined;
      const location = LOCATIONS.find((l) => l.id === m.idLocation);

      return {
        id: m.id,
        dateTime: m.dateTime,
        modelName: model?.name ?? 'Producto',
        size: product?.size ?? '',
        colorName: color?.name ?? '',
        locationName: location?.name ?? 'Desconocido',
        type: m.type,
        quantity: m.quantity,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
      };
    });

    if (search) {
      return result.filter(
        (r) =>
          r.modelName.toLowerCase().includes(search) ||
          r.colorName.toLowerCase().includes(search) ||
          r.referenceId.includes(search),
      );
    }

    result.sort(
      (a, b) =>
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );

    return result;
  });

  readonly totalIn = computed(() =>
    this.filteredMovements()
      .filter((m) => m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0),
  );

  readonly totalOut = computed(() =>
    this.filteredMovements()
      .filter((m) => m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0),
  );

  logMovement(
    type: 'in' | 'out',
    idProduct: string,
    idLocation: string,
    quantity: number,
    referenceType: 'sale' | 'transfer',
    referenceId: string,
  ): void {
    const nextId = String(
      Math.max(...STOCK_MOVEMENTS.map((m) => parseInt(m.id)), 0) + 1,
    );

    STOCK_MOVEMENTS.push({
      id: nextId,
      dateTime: new Date().toISOString(),
      idProduct,
      idLocation,
      type,
      quantity,
      referenceType,
      referenceId,
    });
  }
}
