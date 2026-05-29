import { computed, Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { getSupabase } from './supabase.service';
import { toCamelCase } from '../utils/supabase-utils';
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
  private readonly catalog = inject(CatalogService);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly locationId = signal<string | null>(null);
  readonly typeFilter = signal<'all' | 'in' | 'out'>('all');
  readonly productSearch = signal('');

  private readonly movementsSig = signal<StockMovement[]>([]);

  readonly filteredMovements = computed<MovementRow[]>(() => {
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const locId = this.locationId();
    const type = this.typeFilter();
    const search = this.productSearch().toLowerCase().trim();

    const allProducts = this.catalog.catalogProducts();
    const allModels = this.catalog.catalogModels();
    const allColors = this.catalog.colors();
    const allLocations = this.catalog.locations();

    let movements: StockMovement[] = this.movementsSig();

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
      const product = allProducts.find((p) => p.id === m.idProduct);
      const model = product
        ? allModels.find((x) => x.id === product.idClothingModel)
        : undefined;
      const color = product
        ? allColors.find((c) => c.id === product.idColor)
        : undefined;
      const location = allLocations.find((l) => l.id === m.idLocation);

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

  constructor() {
    this.authService.waitForInit().then(() => this.loadMovements());
  }

  private async loadMovements(): Promise<void> {
    try {
      const { data } = await getSupabase().from('stock_movements').select('*');
      if (data) this.movementsSig.set(data.map((r: Record<string, unknown>) => toCamelCase<StockMovement>(r)));
    } catch (err) {
      console.error('Error loading stock movements:', err);
    }
  }

  async logMovement(
    type: 'in' | 'out',
    idProduct: string,
    idLocation: string,
    quantity: number,
    referenceType: 'sale' | 'transfer',
    referenceId: string,
  ): Promise<void> {
    const { error } = await getSupabase().from('stock_movements').insert({
      id: crypto.randomUUID(),
      date_time: new Date().toISOString(),
      id_product: idProduct,
      id_location: idLocation,
      type,
      quantity,
      reference_type: referenceType,
      reference_id: referenceId,
    });

    if (error) {
      console.error('Error logging stock movement:', error);
      return;
    }

    await this.loadMovements();
  }
}
