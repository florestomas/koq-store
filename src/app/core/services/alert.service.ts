import { computed, Injectable, signal, inject, WritableSignal } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';

export interface AlertItem {
  id: string;
  modelId: string;
  modelName: string;
  size: string;
  colorName: string;
  locationName: string;
  locationId: string;
  currentStock: number;
  minimumStock: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly authService = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly refreshCounter = signal(0);

  readonly selectedLocationId: WritableSignal<string | null> = signal(null);

  readonly alerts = computed<AlertItem[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;
    const filterLocationId = this.selectedLocationId();

    const allStocks = this.catalog.catalogStocks();
    const allProducts = this.catalog.catalogProducts();
    const allModels = this.catalog.catalogModels();
    const allColors = this.catalog.colors();
    const allLocations = this.catalog.locations();

    let stockLocations = allStocks;

    if (!isAdmin && userLocationId) {
      stockLocations = stockLocations.filter(
        (s) => s.idLocation === userLocationId,
      );
    } else if (isAdmin && filterLocationId) {
      stockLocations = stockLocations.filter(
        (s) => s.idLocation === filterLocationId,
      );
    }

    const lowStock = stockLocations.filter(
      (s) => s.currentStock <= s.minimumStock,
    );

    const result: AlertItem[] = [];

    for (const s of lowStock) {
      const product = allProducts.find((p) => p.id === s.idProduct && p.active);
      if (!product) continue;

      const model = allModels.find(
        (m) => m.id === product.idClothingModel && m.active,
      );
      if (!model) continue;

      const color = allColors.find((c) => c.id === product.idColor);
      const location = allLocations.find((l) => l.id === s.idLocation);

      result.push({
        id: s.id,
        modelId: model.id,
        modelName: model.name,
        size: product.size,
        colorName: color?.name ?? '',
        locationName: location?.name ?? '',
        locationId: s.idLocation,
        currentStock: s.currentStock,
        minimumStock: s.minimumStock,
      });
    }

    result.sort((a, b) => a.currentStock - b.currentStock);

    return result;
  });

  readonly alertCount = computed(() => this.alerts().length);

  readonly zeroStockCount = computed(
    () => this.alerts().filter((a) => a.currentStock === 0).length,
  );

  readonly lowStockCount = computed(
    () => this.alerts().filter((a) => a.currentStock > 0 && a.currentStock <= a.minimumStock).length,
  );

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
  }
}
