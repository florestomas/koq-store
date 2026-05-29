import { computed, inject, Injectable, signal } from '@angular/core';
import { deleteProductImage, getSupabase } from './supabase.service';
import { AuthService } from './auth.service';
import { toCamelCase } from '../utils/supabase-utils';
import { CatalogItem, StockAlert, ProductRef, StockRef } from '../../interfaces/catalog-item';
import { Category } from '../../interfaces/category';
import { ClothingModel } from '../../interfaces/clothing-model';
import { Color } from '../../interfaces/color';
import { ClothingModelColor } from '../../interfaces/clothing-model-color';
import { Product } from '../../interfaces/product';
import { StockLocation } from '../../interfaces/stock-location';
import { Location } from '../../interfaces/location';
import { User } from '../../interfaces/user';

export type StockFilter = 'all' | 'low' | 'out';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly authService = inject(AuthService);

  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly stockFilter = signal<StockFilter>('all');
  readonly locationFilterId = signal<string | null>(null);

  readonly refreshCounter = signal(0);

  private readonly categoriesSig = signal<Category[]>([]);
  private readonly modelsSig = signal<ClothingModel[]>([]);
  private readonly productsSig = signal<Product[]>([]);
  private readonly stocksSig = signal<StockLocation[]>([]);
  private readonly colorsSig = signal<Color[]>([]);
  private readonly modelColorsSig = signal<ClothingModelColor[]>([]);
  private readonly locationsSig = signal<Location[]>([]);
  private readonly usersSig = signal<User[]>([]);

  readonly loaded = signal(false);

  readonly categories = computed<Category[]>(() => this.categoriesSig());
  readonly colors = computed<Color[]>(() => this.colorsSig());
  readonly locations = computed<Location[]>(() => this.locationsSig());
  readonly users = computed<User[]>(() => this.usersSig());
  readonly catalogModels = computed<ClothingModel[]>(() => this.modelsSig());
  readonly catalogProducts = computed<Product[]>(() => this.productsSig());
  readonly catalogStocks = computed<StockLocation[]>(() => this.stocksSig());
  readonly catalogModelColors = computed<ClothingModelColor[]>(() => this.modelColorsSig());

  readonly filteredItems = computed<CatalogItem[]>(() => {
    const _refresh = this.refreshCounter();
    const user = this.authService.currentUser();
    const isAdmin = user?.role === 'admin';

    const term = this.searchTerm().toLowerCase().trim();
    const catId = this.selectedCategoryId();
    const stockF = this.stockFilter();
    const locId = isAdmin ? this.locationFilterId() : (user?.idLocation ?? null);

    const allModels = this.modelsSig();
    const allProducts = this.productsSig();
    const allStocksList = this.stocksSig();
    const allCategories = this.categoriesSig();
    const allColors = this.colorsSig();
    const allModelColors = this.modelColorsSig();
    const allLocations = this.locationsSig();

    let models = allModels.filter((m) => m.active);

    if (term) {
      models = models.filter((m) => m.name.toLowerCase().includes(term));
    }

    if (catId) {
      models = models.filter((m) => m.idCategory === catId);
    }

    const items: CatalogItem[] = models.map((model) => {
      const modelProducts = allProducts.filter((p) => p.idClothingModel === model.id && p.active);
      const productIds = modelProducts.map((p) => p.id);

      const locationIds = locId ? [locId] : allLocations.map((l) => l.id);
      const stocks = allStocksList.filter(
        (s) => productIds.includes(s.idProduct) && locationIds.includes(s.idLocation),
      );

      const categoryName =
        allCategories.find((c) => c.id === model.idCategory)?.name ?? '';

      const modelColors = allModelColors.filter(
        (mc) => mc.idClothingModel === model.id,
      );
      const imageUrl = modelColors[0]?.imageUrl ?? '';

      const locationStocks = locationIds.map((lid) => {
        const locStocks = stocks.filter((s) => s.idLocation === lid);
        const total = locStocks.reduce((sum, s) => sum + s.currentStock, 0);
        const minTotal = locStocks.reduce((sum, s) => sum + s.minimumStock, 0);
        return {
          locationId: lid,
          locationName: allLocations.find((l) => l.id === lid)?.name ?? lid,
          stock: total,
          minimumStock: minTotal,
        };
      });

      const totalStock = locationStocks.reduce((sum, ls) => sum + ls.stock, 0);

      const productColors = [...new Set(modelProducts.map((p) => p.idColor))];
      const colorSizeGrid = productColors.map((cid) => {
        const colorName = allColors.find((c) => c.id === cid)?.name ?? cid;
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

      const allStocks: StockRef[] = allStocksList.filter((s) =>
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

  constructor() {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      await this.authService.waitForInit();
      const supabase = getSupabase();
      const [
        { data: rawCategories },
        { data: rawModels },
        { data: rawProducts },
        { data: rawStocks },
        { data: rawColors },
        { data: rawModelColors },
        { data: rawLocations },
        { data: rawUsers },
      ] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('clothing_models').select('*'),
        supabase.from('products').select('*'),
        supabase.from('stock_locations').select('*'),
        supabase.from('colors').select('*'),
        supabase.from('clothing_model_colors').select('*'),
        supabase.from('locations').select('*'),
        supabase.from('users').select('*'),
      ]);

      if (rawCategories) this.categoriesSig.set(rawCategories.map((r: Record<string, unknown>) => toCamelCase<Category>(r)));
      if (rawModels) this.modelsSig.set(rawModels.map((r: Record<string, unknown>) => toCamelCase<ClothingModel>(r)));
      if (rawProducts) this.productsSig.set(rawProducts.map((r: Record<string, unknown>) => toCamelCase<Product>(r)));
      if (rawStocks) this.stocksSig.set(rawStocks.map((r: Record<string, unknown>) => toCamelCase<StockLocation>(r)));
      if (rawColors) this.colorsSig.set(rawColors.map((r: Record<string, unknown>) => toCamelCase<Color>(r)));
      if (rawModelColors) this.modelColorsSig.set(rawModelColors.map((r: Record<string, unknown>) => toCamelCase<ClothingModelColor>(r)));
      if (rawLocations) this.locationsSig.set(rawLocations.map((r: Record<string, unknown>) => toCamelCase<Location>(r)));
      if (rawUsers) this.usersSig.set(rawUsers.map((r: Record<string, unknown>) => toCamelCase<User>(r)));
    } catch (err) {
      console.error('Error loading catalog data:', err);
    } finally {
      this.loaded.set(true);
    }
  }

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
    return this.locationsSig();
  }

  async hardDeleteModel(modelId: string): Promise<void> {
    const supabase = getSupabase();
    const models = this.modelsSig();
    const products = this.productsSig();
    const modelColors = this.modelColorsSig();
    const stocks = this.stocksSig();

    const model = models.find((m) => m.id === modelId);
    if (!model) return;

    const productIds = products
      .filter((p) => p.idClothingModel === modelId)
      .map((p) => p.id);

    const mcList = modelColors.filter((mc) => mc.idClothingModel === modelId);
    for (const mc of mcList) {
      if (mc.imageUrl && !mc.imageUrl.includes('placehold.co')) {
        await deleteProductImage(mc.imageUrl).catch(() => {});
      }
    }

    if (productIds.length > 0) {
      await supabase.from('transfer_details').delete().in('id_product', productIds);
      await supabase.from('sale_details').delete().in('id_product', productIds);
      await supabase.from('stock_movements').delete().in('id_product', productIds);
      await supabase.from('stock_locations').delete().in('id_product', productIds);
      await supabase.from('products').delete().eq('id_clothing_model', modelId);
    }

    if (mcList.length > 0) {
      await supabase
        .from('clothing_model_colors')
        .delete()
        .eq('id_clothing_model', modelId);
    }

    await supabase.from('clothing_models').delete().eq('id', modelId);

    this.triggerRefresh();
  }

  triggerRefresh(): Promise<void> {
    this.refreshCounter.set(this.refreshCounter() + 1);
    return this.loadData();
  }
}
