import { computed, inject, Injectable, signal } from '@angular/core';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { CATEGORIES } from '../../mocks/category.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { LOCATIONS } from '../../mocks/location.mock';
import { COLORS } from '../../mocks/colors.mock';
import { CLOTHING_MODEL_COLORS } from '../../mocks/clothing-model-colors.mock';
import { TRANSFERS } from '../../mocks/transfer.mock';
import { TRANSFER_DETAILS } from '../../mocks/transfer-details.mock';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';

export interface TransferItem {
  modelId: string;
  modelName: string;
  imageUrl: string;
  colorId: string;
  colorName: string;
  size: string;
  productId: string;
  stockAtOrigin: number;
  quantity: number;
}

export interface SelectableModel {
  modelId: string;
  modelName: string;
  imageUrl: string;
  categoryName: string;
  totalStock: number;
  colors: { id: string; name: string }[];
  sizes: string[];
}

@Injectable({ providedIn: 'root' })
export class TransferService {
  readonly originId = computed(() => {
    const user = this.authService.currentUser();
    if (user?.role === 'operator') return user.idLocation;
    return '1';
  });
  readonly destinationId = signal<string | null>(null);
  readonly items = signal<TransferItem[]>([]);
  readonly searchTerm = signal('');
  readonly categoryFilterId = signal<string | null>(null);

  private readonly authService = inject(AuthService);
  private readonly catalogService = inject(CatalogService);

  readonly totalItems = computed(() => this.items().length);
  readonly totalQuantity = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity, 0),
  );

  readonly categories = computed(() => CATEGORIES);

  readonly selectableModels = computed<SelectableModel[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const catId = this.categoryFilterId();
    const origin = this.originId();

    return CLOTHING_MODELS.filter((m) => m.active)
      .filter((m) => (term ? m.name.toLowerCase().includes(term) : true))
      .filter((m) => (catId ? m.idCategory === catId : true))
      .map((m) => {
        const modelProducts = PRODUCTS.filter(
          (p) => p.idClothingModel === m.id && p.active,
        );

        const colorIds = [...new Set(modelProducts.map((p) => p.idColor))];
        const colors = colorIds.map((cid) => ({
          id: cid,
          name: COLORS.find((c) => c.id === cid)?.name ?? cid,
        }));

        const sizes = [...new Set(modelProducts.map((p) => p.size))].sort(
          (a, b) => parseInt(a) - parseInt(b),
        );

        const totalStock = STOCK_LOCATIONS.filter(
          (s) => s.idLocation === origin && modelProducts.some((p) => p.id === s.idProduct),
        ).reduce((sum, s) => sum + s.currentStock, 0);

        const imageUrl =
          CLOTHING_MODEL_COLORS.find((mc) => mc.idClothingModel === m.id)?.imageUrl ?? '';

        const categoryName = CATEGORIES.find((c) => c.id === m.idCategory)?.name ?? '';

        return {
          modelId: m.id,
          modelName: m.name,
          imageUrl,
          categoryName,
          totalStock,
          colors,
          sizes,
        };
      })
      .filter((m) => m.totalStock > 0);
  });

  getStockForColorSize(productId: string, locationId: string): number {
    return STOCK_LOCATIONS.filter(
      (s) => s.idProduct === productId && s.idLocation === locationId,
    ).reduce((sum, s) => sum + s.currentStock, 0);
  }

  getProductId(modelId: string, colorId: string, size: string): string | null {
    return (
      PRODUCTS.find(
        (p) =>
          p.idClothingModel === modelId && p.idColor === colorId && p.size === size && p.active,
      )?.id ?? null
    );
  }

  addItem(model: SelectableModel, colorId: string, size: string): void {
    const productId = this.getProductId(model.modelId, colorId, size);
    if (!productId) return;

    const origin = this.originId();
    const stockAtOrigin = this.getStockForColorSize(productId, origin);

    if (stockAtOrigin <= 0) return;

    const existing = this.items().findIndex(
      (i) =>
        i.productId === productId &&
        i.modelId === model.modelId &&
        i.colorId === colorId &&
        i.size === size,
    );

    if (existing !== -1) {
      const currentItems = [...this.items()];
      const current = currentItems[existing];
      if (current.quantity < stockAtOrigin) {
        currentItems[existing] = { ...current, quantity: current.quantity + 1 };
        this.items.set(currentItems);
      }
    } else {
      const colorName = COLORS.find((c) => c.id === colorId)?.name ?? colorId;
      this.items.update((items) => [
        ...items,
        {
          modelId: model.modelId,
          modelName: model.modelName,
          imageUrl: model.imageUrl,
          colorId,
          colorName,
          size,
          productId,
          stockAtOrigin,
          quantity: 1,
        },
      ]);
    }
  }

  addItemsFromPicker(model: SelectableModel, quantities: Record<string, Record<string, number>>): void {
    const items = [...this.items()];
    const origin = this.originId();

    for (const colorId of Object.keys(quantities)) {
      for (const size of Object.keys(quantities[colorId])) {
        const qty = quantities[colorId][size];
        if (qty <= 0) continue;

        const productId = this.getProductId(model.modelId, colorId, size);
        if (!productId) continue;

        const stockAtOrigin = this.getStockForColorSize(productId, origin);
        if (stockAtOrigin <= 0) continue;

        const existing = items.findIndex(
          (i) =>
            i.productId === productId &&
            i.modelId === model.modelId &&
            i.colorId === colorId &&
            i.size === size,
        );

        if (existing !== -1) {
          const newQty = Math.min(items[existing].quantity + qty, stockAtOrigin);
          items[existing] = { ...items[existing], quantity: newQty, stockAtOrigin };
        } else {
          const colorName = COLORS.find((c) => c.id === colorId)?.name ?? colorId;
          items.push({
            modelId: model.modelId,
            modelName: model.modelName,
            imageUrl: model.imageUrl,
            colorId,
            colorName,
            size,
            productId,
            stockAtOrigin,
            quantity: Math.min(qty, stockAtOrigin),
          });
        }
      }
    }

    this.items.set(items);
  }

  changeQuantity(index: number, delta: number): void {
    const currentItems = [...this.items()];
    const item = currentItems[index];
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      currentItems.splice(index, 1);
    } else if (newQty <= item.stockAtOrigin) {
      currentItems[index] = { ...item, quantity: newQty };
    }
    this.items.set(currentItems);
  }

  removeItem(index: number): void {
    const currentItems = [...this.items()];
    currentItems.splice(index, 1);
    this.items.set(currentItems);
  }

  confirmTransfer(): boolean {
    const destId = this.destinationId();
    const currentItems = this.items();
    if (!destId || currentItems.length === 0) return false;

    const user = this.authService.currentUser();
    if (!user) return false;

    const nextTransferId = String(
      Math.max(...TRANSFERS.map((t) => parseInt(t.id)), 0) + 1,
    );

    TRANSFERS.push({
      id: nextTransferId,
      dateTime: new Date().toISOString(),
      idOrigin: this.originId(),
      idDestination: destId,
      idUserOrigin: user.id,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    });

    for (const item of currentItems) {
      const nextDetailId = String(
        Math.max(...TRANSFER_DETAILS.map((d) => parseInt(d.id)), 0) + 1,
      );
      TRANSFER_DETAILS.push({
        id: nextDetailId,
        idTransfer: nextTransferId,
        idProduct: item.productId,
        quantity: item.quantity,
      });

      const originStock = STOCK_LOCATIONS.find(
        (s) => s.idProduct === item.productId && s.idLocation === this.originId(),
      );
      if (originStock) {
        originStock.currentStock = Math.max(0, originStock.currentStock - item.quantity);
      }

      const destStock = STOCK_LOCATIONS.find(
        (s) => s.idProduct === item.productId && s.idLocation === destId,
      );
      if (destStock) {
        destStock.currentStock += item.quantity;
      } else {
        STOCK_LOCATIONS.push({
          id: String(Math.max(...STOCK_LOCATIONS.map((s) => parseInt(s.id)), 0) + 1),
          idProduct: item.productId,
          idLocation: destId,
          currentStock: item.quantity,
          minimumStock: 1,
        });
      }
    }

    this.items.set([]);
    this.catalogService.triggerRefresh();
    return true;
  }

  getLocations() {
    return LOCATIONS;
  }
}
