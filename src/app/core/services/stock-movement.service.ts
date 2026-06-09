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
  referenceType: 'sale' | 'transfer' | 'ingreso';
  referenceId: string;
}

export interface IngresoDetail {
  modelName: string;
  size: string;
  colorName: string;
  quantity: number;
}

export interface IngresoGroup {
  id: string;
  dateTime: string;
  locationName: string;
  itemCount: number;
  totalUnits: number;
  details: IngresoDetail[];
}

@Injectable({ providedIn: 'root' })
export class StockMovementService {
  private readonly authService = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  readonly deleting = signal(false);

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly locationId = signal<string | null>(null);
  readonly typeFilter = signal<'all' | 'in' | 'out'>('all');
  readonly productSearch = signal('');

  private readonly movementsSig = signal<StockMovement[]>([]);

  readonly filteredMovements = computed<MovementRow[]>(() => {
    const user = this.authService.currentUser();
    const isAdmin = this.authService.isAdmin();
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

    if (isAdmin && locId) {
      movements = movements.filter((m) => m.idLocation === locId);
    } else if (!isAdmin && userLocationId) {
      movements = movements.filter((m) => m.idLocation === userLocationId);
    }

    if (type !== 'all') {
      movements = movements.filter((m) => m.type === type);
    }

    if (from) {
      const fromUtc = new Date(from + 'T00:00:00').toISOString();
      movements = movements.filter((m) => m.dateTime >= fromUtc);
    }
    if (to) {
      const toUtc = new Date(to + 'T23:59:59.999').toISOString();
      movements = movements.filter((m) => m.dateTime <= toUtc);
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

  readonly groupedIngresos = computed<IngresoGroup[]>(() => {
    const user = this.authService.currentUser();
    const isAdmin = this.authService.isAdmin();
    const userLocationId = user?.idLocation;

    const from = this.dateFrom();
    const to = this.dateTo();
    const locId = this.locationId();

    const allProducts = this.catalog.catalogProducts();
    const allModels = this.catalog.catalogModels();
    const allColors = this.catalog.colors();
    const allLocations = this.catalog.locations();

    let movements = this.movementsSig().filter((m) => m.referenceType === 'ingreso');

    if (isAdmin && locId) {
      movements = movements.filter((m) => m.idLocation === locId);
    } else if (!isAdmin && userLocationId) {
      movements = movements.filter((m) => m.idLocation === userLocationId);
    }

    if (from) {
      const fromUtc = new Date(from + 'T00:00:00').toISOString();
      movements = movements.filter((m) => m.dateTime >= fromUtc);
    }
    if (to) {
      const toUtc = new Date(to + 'T23:59:59.999').toISOString();
      movements = movements.filter((m) => m.dateTime <= toUtc);
    }

    const groups = new Map<string, { dateTime: string; locationId: string; items: StockMovement[] }>();
    for (const m of movements) {
      if (!groups.has(m.referenceId)) {
        groups.set(m.referenceId, { dateTime: m.dateTime, locationId: m.idLocation, items: [] });
      }
      groups.get(m.referenceId)!.items.push(m);
    }

    const result: IngresoGroup[] = [];
    for (const [id, group] of groups) {
      const details: IngresoDetail[] = group.items.map((m) => {
        const product = allProducts.find((p) => p.id === m.idProduct);
        const model = product ? allModels.find((x) => x.id === product.idClothingModel) : undefined;
        const color = product ? allColors.find((c) => c.id === product.idColor) : undefined;
        return {
          modelName: model?.name ?? 'Producto',
          size: product?.size ?? '',
          colorName: color?.name ?? '',
          quantity: m.quantity,
        };
      });

      result.push({
        id,
        dateTime: group.dateTime,
        locationName: allLocations.find((l) => l.id === group.locationId)?.name ?? 'Desconocido',
        itemCount: details.length,
        totalUnits: details.reduce((sum, d) => sum + d.quantity, 0),
        details,
      });
    }

    result.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    return result;
  });

  readonly totalIngresadas = computed(() =>
    this.groupedIngresos().reduce((sum, g) => sum + g.totalUnits, 0),
  );

  constructor() {
    this.authService.waitForInit().then(() => this.loadMovements());
  }

  refresh(): void {
    this.loadMovements();
  }

  private async loadMovements(): Promise<void> {
    try {
      const data = await this.fetchAll('stock_movements');
      if (data.length) this.movementsSig.set(data.map((r: Record<string, unknown>) => toCamelCase<StockMovement>(r)));
    } catch (err) {
      console.error('Error loading stock movements:', err);
    }
  }

  private async fetchAll(table: string): Promise<Record<string, unknown>[]> {
    const supabase = getSupabase();
    const pageSize = 1000;
    const allRows: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
        break;
      }

      if (!data || data.length === 0) break;

      allRows.push(...data);

      if (data.length < pageSize) break;

      from += pageSize;
    }

    return allRows;
  }

  async logMovement(
    type: 'in' | 'out',
    idProduct: string,
    idLocation: string,
    quantity: number,
    referenceType: 'sale' | 'transfer' | 'ingreso',
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

  async deleteMovement(movementId: string): Promise<boolean> {
    if (!window.confirm('¿Eliminar este movimiento definitivamente? Esta acción no se puede deshacer.')) return false;
    try {
      await getSupabase().from('stock_movements').delete().eq('id', movementId);
      await this.loadMovements();
      return true;
    } catch (err) {
      console.error('Error deleting movement:', err);
      return false;
    }
  }

  async deleteIngresoGroup(referenceId: string): Promise<boolean> {
    if (!window.confirm('¿Eliminar este ingreso definitivamente? Esta acción no se puede deshacer.')) return false;
    this.deleting.set(true);
    try {
      const supabase = getSupabase();
      const movements = this.movementsSig().filter(
        (m) => m.referenceType === 'ingreso' && m.referenceId === referenceId,
      );

      for (const m of movements) {
        const { data: stockRows } = await supabase
          .from('stock_locations')
          .select('*')
          .eq('id_product', m.idProduct)
          .eq('id_location', m.idLocation);

        if (stockRows && stockRows.length > 0) {
          const stock = stockRows[0];
          await supabase
            .from('stock_locations')
            .update({
              current_stock: Math.max(0, stock['current_stock'] - m.quantity),
            })
            .eq('id', stock['id']);
        }
      }

      await supabase.from('stock_movements').delete().eq('reference_type', 'ingreso').eq('reference_id', referenceId);
      await this.loadMovements();
      return true;
    } catch (err) {
      console.error('Error deleting ingreso group:', err);
      return false;
    } finally {
      this.deleting.set(false);
    }
  }
}
