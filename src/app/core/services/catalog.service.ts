import { computed, inject, Injectable, signal } from '@angular/core';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { CATEGORIES } from '../../mocks/category.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { LOCATIONS } from '../../mocks/location.mock';
import { COLORS } from '../../mocks/colors.mock';
import { CLOTHING_MODEL_COLORS } from '../../mocks/clothing-model-colors.mock';
import { CatalogItem, StockAlert, ProductRef, StockRef } from '../../interfaces/catalog-item';
import { Category } from '../../interfaces/category';
import { AuthService } from './auth.service';

export type StockFilter = 'all' | 'low' | 'out';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly authService = inject(AuthService);

  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly stockFilter = signal<StockFilter>('all');
  readonly locationFilterId = signal<string | null>(null);

  readonly refreshCounter = signal(0);

  readonly categories = computed<Category[]>(() => CATEGORIES);

  readonly filteredItems = computed<CatalogItem[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _refresh = this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';

    const term = this.searchTerm().toLowerCase().trim();
    const catId = this.selectedCategoryId();
    const stockF = this.stockFilter();
    const locId = isAdmin ? this.locationFilterId() : (user?.idLocation ?? null);

    let models = CLOTHING_MODELS.filter((m) => m.active);

    if (term) {
      models = models.filter((m) => m.name.toLowerCase().includes(term));
    }

    if (catId) {
      models = models.filter((m) => m.idCategory === catId);
    }

    const items: CatalogItem[] = models.map((model) => {
      const modelProducts = PRODUCTS.filter((p) => p.idClothingModel === model.id && p.active);
      const productIds = modelProducts.map((p) => p.id);

      const locationIds = locId ? [locId] : LOCATIONS.map((l) => l.id);
      const stocks = STOCK_LOCATIONS.filter(
        (s) => productIds.includes(s.idProduct) && locationIds.includes(s.idLocation),
      );

      const categoryName =
        CATEGORIES.find((c) => c.id === model.idCategory)?.name ?? '';

      const modelColors = CLOTHING_MODEL_COLORS.filter(
        (mc) => mc.idClothingModel === model.id,
      );
      const imageUrl = modelColors[0]?.imageUrl ?? '';

      const locationStocks = locationIds.map((lid) => {
        const locStocks = stocks.filter((s) => s.idLocation === lid);
        const total = locStocks.reduce((sum, s) => sum + s.currentStock, 0);
        const minTotal = locStocks.reduce((sum, s) => sum + s.minimumStock, 0);
        return {
          locationId: lid,
          locationName: LOCATIONS.find((l) => l.id === lid)?.name ?? lid,
          stock: total,
          minimumStock: minTotal,
        };
      });

      const totalStock = locationStocks.reduce((sum, ls) => sum + ls.stock, 0);

      const productColors = [...new Set(modelProducts.map((p) => p.idColor))];
      const colorSizeGrid = productColors.map((cid) => {
        const colorName = COLORS.find((c) => c.id === cid)?.name ?? cid;
        const colorProducts = modelProducts.filter((p) => p.idColor === cid);
        const sizes = [...new Set(colorProducts.map((p) => p.size))].sort((a, b) => parseInt(a) - parseInt(b)).map((size) => {
          const sizeProducts = colorProducts.filter((p) => p.size === size);
          const sizeStock = stocks
            .filter((s) => sizeProducts.some((sp) => sp.id === s.idProduct))
            .reduce((sum, s) => sum + s.currentStock, 0);
          return { size, stock: sizeStock };
        });
        return { colorName, sizes };
      });

      const stockAlerts: StockAlert[] = locationStocks
        .filter((ls) => {
          const hasLow = stocks.some(
            (s) =>
              s.idLocation === ls.locationId && s.currentStock > 0 && s.currentStock <= s.minimumStock,
          );
          const hasOut = stocks.some(
            (s) => s.idLocation === ls.locationId && s.currentStock === 0,
          );
          return hasLow || hasOut;
        })
        .map((ls) => {
          const hasOut = stocks.some(
            (s) => s.idLocation === ls.locationId && s.currentStock === 0,
          );
          return {
            locationName: ls.locationName,
            type: hasOut ? ('out' as const) : ('low' as const),
          };
        });

      const products: ProductRef[] = modelProducts.map((p) => ({
        id: p.id,
        idColor: p.idColor,
        size: p.size,
      }));

      const allStocks: StockRef[] = STOCK_LOCATIONS.filter((s) =>
        productIds.includes(s.idProduct),
      ).map((s) => ({
        idProduct: s.idProduct,
        idLocation: s.idLocation,
        currentStock: s.currentStock,
      }));

      return {
        modelId: model.id,
        modelName: model.name,
        categoryName,
        imageUrl,
        totalStock,
        locationStocks,
        colorSizeGrid,
        stockAlerts,
        products,
        allStocks,
      };
    });

    if (stockF === 'low') {
      return items.filter((item) => item.stockAlerts.length > 0);
    }

    if (stockF === 'out') {
      return items.filter((item) => item.stockAlerts.some((a) => a.type === 'out'));
    }

    return items;
  });

  readonly totalInventory = computed<number>(() =>
    this.filteredItems().reduce((sum, item) => sum + item.totalStock, 0),
  );

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setSelectedCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
  }

  setStockFilter(value: StockFilter): void {
    this.stockFilter.set(value);
  }

  setLocationFilter(locationId: string | null): void {
    const user = this.authService.currentUser();
    if (user?.role !== 'admin') return;
    this.locationFilterId.set(locationId);
  }

  getLocations() {
    return LOCATIONS;
  }

  triggerRefresh(): void {
    this.refreshCounter.set(this.refreshCounter() + 1);
  }
}
