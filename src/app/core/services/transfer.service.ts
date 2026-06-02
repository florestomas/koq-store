import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { StockMovementService } from './stock-movement.service';
import { ReceptionService } from './reception.service';
import { getSupabase } from './supabase.service';

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
  readonly destinationId = signal<string>('');
  readonly items = signal<TransferItem[]>([]);
  readonly searchTerm = signal('');
  readonly categoryFilterId = signal<string | null>(null);
  readonly warning = signal<string | null>(null);

  private readonly authService = inject(AuthService);
  private readonly catalogService = inject(CatalogService);
  private readonly stockMovementService = inject(StockMovementService);
  private readonly receptionService = inject(ReceptionService);

  readonly totalItems = computed(() => this.items().length);
  readonly totalQuantity = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity, 0),
  );

  readonly categories = computed(() => this.catalogService.categories());

  readonly selectableModels = computed<SelectableModel[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const catId = this.categoryFilterId();
    const origin = this.originId();

    const allModels = this.catalogService.catalogModels();
    const allProducts = this.catalogService.catalogProducts();
    const allStocks = this.catalogService.catalogStocks();
    const allColors = this.catalogService.colors();
    const allModelColors = this.catalogService.catalogModelColors();
    const allCategories = this.catalogService.categories();

    return allModels
      .filter((m) => m.active)
      .filter((m) => (term ? m.name.toLowerCase().includes(term) : true))
      .filter((m) => (catId ? m.idCategory === catId : true))
      .map((m) => {
        const modelProducts = allProducts.filter(
          (p) => p.idClothingModel === m.id && p.active,
        );

        const colorIds = [...new Set(modelProducts.map((p) => p.idColor))];
        const colors = colorIds.map((cid) => ({
          id: cid,
          name: allColors.find((c) => c.id === cid)?.name ?? cid,
        }));

        const sizes = [...new Set(modelProducts.map((p) => p.size))].sort(
          (a, b) => parseInt(a) - parseInt(b),
        );

        const totalStock = allStocks
          .filter(
            (s) =>
              s.idLocation === origin &&
              modelProducts.some((p) => p.id === s.idProduct),
          )
          .reduce((sum, s) => sum + s.currentStock, 0);

        const imageUrl =
          allModelColors.find((mc) => mc.idClothingModel === m.id)?.imageUrl ?? '';

        const categoryName =
          allCategories.find((c) => c.id === m.idCategory)?.name ?? '';

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
    return this.catalogService
      .catalogStocks()
      .filter(
        (s) => s.idProduct === productId && s.idLocation === locationId,
      )
      .reduce((sum, s) => sum + s.currentStock, 0);
  }

  getProductId(
    modelId: string,
    colorId: string,
    size: string,
  ): string | null {
    const allProducts = this.catalogService.catalogProducts();
    return (
      allProducts.find(
        (p) =>
          p.idClothingModel === modelId &&
          p.idColor === colorId &&
          p.size === size &&
          p.active,
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
        currentItems[existing] = {
          ...current,
          quantity: current.quantity + 1,
        };
        this.items.set(currentItems);
      }
    } else {
      const allColors = this.catalogService.colors();
      const colorName =
        allColors.find((c) => c.id === colorId)?.name ?? colorId;
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

  addItemsFromPicker(
    model: SelectableModel,
    quantities: Record<string, Record<string, number>>,
  ): void {
    const items = [...this.items()];
    const origin = this.originId();
    const allColors = this.catalogService.colors();
    const allProducts = this.catalogService.catalogProducts();
    const allStocks = this.catalogService.catalogStocks();

    for (const colorId of Object.keys(quantities)) {
      for (const size of Object.keys(quantities[colorId])) {
        const qty = quantities[colorId][size];
        if (qty <= 0) continue;

        const productId = this.getProductId(model.modelId, colorId, size);
        if (!productId) continue;

        const stockAtOrigin =
          allStocks
            .filter(
              (s) => s.idProduct === productId && s.idLocation === origin,
            )
            .reduce((sum, s) => sum + s.currentStock, 0) ?? 0;
        if (stockAtOrigin <= 0) continue;

        const existing = items.findIndex(
          (i) =>
            i.productId === productId &&
            i.modelId === model.modelId &&
            i.colorId === colorId &&
            i.size === size,
        );

        if (existing !== -1) {
          const newQty = Math.min(
            items[existing].quantity + qty,
            stockAtOrigin,
          );
          items[existing] = {
            ...items[existing],
            quantity: newQty,
            stockAtOrigin,
          };
        } else {
          const colorName =
            allColors.find((c) => c.id === colorId)?.name ?? colorId;
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
    if (Object.keys(quantities).length > 0) this.warning.set(null);
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
      this.warning.set(null);
    } else {
      this.warning.set(`Stock insuficiente: solo hay ${item.stockAtOrigin} de ${item.modelName} T.${item.size} ${item.colorName}`);
      setTimeout(() => this.warning.set(null), 4000);
    }
    this.items.set(currentItems);
  }

  removeItem(index: number): void {
    const currentItems = [...this.items()];
    currentItems.splice(index, 1);
    this.items.set(currentItems);
  }

  async confirmTransfer(): Promise<boolean> {
    const destId = this.destinationId();
    const currentItems = this.items();
    if (!destId || currentItems.length === 0) return false;

    const user = this.authService.currentUser();
    if (!user) return false;

    const supabase = getSupabase();
    const transferId = crypto.randomUUID();

    try {
      for (const item of currentItems) {
        const stock = this.getStockForColorSize(item.productId, this.originId());
        if (item.quantity > stock) {
          console.error(`Stock insuficiente: ${item.modelName} T.${item.size} ${item.colorName} (${stock} disponible)`);
          return false;
        }
      }
      const { error: transferError } = await supabase
        .from('transfers')
        .insert({
          id: transferId,
          date_time: new Date().toISOString(),
          id_origin: this.originId(),
          id_destination: destId,
          id_user_origin: user.id,
          status: 'pending',
        });

      if (transferError) {
        console.error('Error creating transfer:', transferError);
        return false;
      }

      for (const item of currentItems) {
        const { error: detailError } = await supabase
          .from('transfer_details')
          .insert({
            id: crypto.randomUUID(),
            id_transfer: transferId,
            id_product: item.productId,
            quantity: item.quantity,
          });

        if (detailError) {
          console.error('Error creating transfer detail:', detailError);
          await supabase.from('transfer_details').delete().eq('id_transfer', transferId);
          await supabase.from('transfers').delete().eq('id', transferId);
          return false;
        }

        const { data: originStocks } = await supabase
          .from('stock_locations')
          .select('*')
          .eq('id_product', item.productId)
          .eq('id_location', this.originId());

        if (originStocks && originStocks.length > 0) {
          const originStock = originStocks[0];
          const { error: stockError } = await supabase
            .from('stock_locations')
            .update({
              current_stock: Math.max(
                0,
                originStock.current_stock - item.quantity,
              ),
            })
            .eq('id', originStock.id);

          if (stockError) {
            console.error('Error updating stock:', stockError);
            await supabase.from('transfer_details').delete().eq('id_transfer', transferId);
            await supabase.from('transfers').delete().eq('id', transferId);
            return false;
          }
        }

        await this.stockMovementService.logMovement(
          'out',
          item.productId,
          this.originId(),
          item.quantity,
          'transfer',
          transferId,
        );
      }

      this.items.set([]);
      this.destinationId.set('');
      this.catalogService.triggerRefresh();
      this.receptionService.refresh();
      return true;
    } catch (err) {
      console.error('Error in confirmTransfer:', err);
      await supabase.from('transfer_details').delete().eq('id_transfer', transferId);
      await supabase.from('transfers').delete().eq('id', transferId);
      return false;
    }
  }

  getLocations() {
    return this.catalogService.locations();
  }
}
