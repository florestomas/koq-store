import { computed, Injectable, signal, inject, WritableSignal } from '@angular/core';
import { AuthService } from './auth.service';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { COLORS } from '../../mocks/colors.mock';
import { LOCATIONS } from '../../mocks/location.mock';

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
  private readonly refreshCounter = signal(0);

  readonly selectedLocationId: WritableSignal<string | null> = signal(null);

  readonly alerts = computed<AlertItem[]>(() => {
    this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';
    const userLocationId = user?.idLocation;
    const filterLocationId = this.selectedLocationId();

    let stockLocations = STOCK_LOCATIONS;

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
      const product = PRODUCTS.find((p) => p.id === s.idProduct && p.active);
      if (!product) continue;

      const model = CLOTHING_MODELS.find(
        (m) => m.id === product.idClothingModel && m.active,
      );
      if (!model) continue;

      const color = COLORS.find((c) => c.id === product.idColor);
      const location = LOCATIONS.find((l) => l.id === s.idLocation);

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
    () => this.alerts().filter((a) => a.currentStock > 0).length,
  );

  refresh(): void {
    this.refreshCounter.update((c) => c + 1);
  }
}
