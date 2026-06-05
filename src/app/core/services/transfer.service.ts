import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { StockMovementService } from './stock-movement.service';
import { ReceptionService } from './reception.service';
import { getSupabase } from './supabase.service';
import { toCamelCase } from '../utils/supabase-utils';
import { Product } from '../../interfaces/product';
import { ClothingModel } from '../../interfaces/clothing-model';
import { Color } from '../../interfaces/color';
import { ClothingModelColor } from '../../interfaces/clothing-model-color';
import { StockLocation } from '../../interfaces/stock-location';

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
  salePrice: number;
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
  private static readonly CACHE_KEY = 'koq-transfer-cache';
  private static readonly LAST_CACHE_KEY = 'koq-transfer-last';

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
  readonly editingTransferId = signal<string | null>(null);
  readonly isEditing = computed(() => this.editingTransferId() !== null);
  private lastTransferData = signal<{ destinationId: string; items: TransferItem[] } | null>(null);
  readonly hasLastTransfer = computed(() => this.lastTransferData() !== null);

  private readonly authService = inject(AuthService);
  private readonly catalogService = inject(CatalogService);
  private readonly stockMovementService = inject(StockMovementService);
  private readonly receptionService = inject(ReceptionService);

  constructor() {
    this.restoreFromCache();
    this.restoreLastTransfer();
  }

  setDestinationId(id: string): void {
    this.destinationId.set(id);
    this.saveToCache();
  }

  clearCache(): void {
    sessionStorage.removeItem(TransferService.CACHE_KEY);
  }

  private saveToCache(): void {
    const items = this.items();
    const destinationId = this.destinationId();
    if (items.length === 0 || !destinationId) {
      sessionStorage.removeItem(TransferService.CACHE_KEY);
      return;
    }
    sessionStorage.setItem(TransferService.CACHE_KEY, JSON.stringify({ items, destinationId }));
  }

  private restoreFromCache(): void {
    if (this.editingTransferId()) return;
    const raw = sessionStorage.getItem(TransferService.CACHE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.items) && data.items.length > 0 && data.destinationId) {
        this.items.set(data.items);
        this.destinationId.set(data.destinationId);
      } else {
        sessionStorage.removeItem(TransferService.CACHE_KEY);
      }
    } catch {
      sessionStorage.removeItem(TransferService.CACHE_KEY);
    }
  }

  readonly totalItems = computed(() => this.items().length);
  readonly totalQuantity = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity, 0),
  );
  readonly totalValue = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity * i.salePrice, 0),
  );

  readonly categories = computed(() => this.catalogService.categories());

  readonly selectableModels = computed<SelectableModel[]>(() => {
    const rawTerm = this.searchTerm().toLowerCase().trim();
    const term = rawTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
      .filter((m) => (term ? m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term) : true))
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

        const rawStock = allStocks
          .filter(
            (s) =>
              s.idLocation === origin &&
              modelProducts.some((p) => p.id === s.idProduct),
          )
          .reduce((sum, s) => sum + s.currentStock, 0);

        const productIds = modelProducts.map((p) => p.id);
        const alreadyInTransfer = this.items()
          .filter((i) => productIds.includes(i.productId))
          .reduce((sum, i) => sum + i.quantity, 0);

        const totalStock = Math.max(0, rawStock - alreadyInTransfer);

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

    const salePrice =
      this.catalogService.catalogProducts().find((p) => p.id === productId)?.salePrice ?? 0;

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
          salePrice,
        },
      ]);
    }
    this.saveToCache();
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

        const salePrice =
          allProducts.find((p) => p.id === productId)?.salePrice ?? 0;

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
            salePrice,
          });
        }
      }
      }

    this.items.set(items);
    if (Object.keys(quantities).length > 0) this.warning.set(null);
    this.saveToCache();
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
    this.saveToCache();
  }

  removeItem(index: number): void {
    const currentItems = [...this.items()];
    currentItems.splice(index, 1);
    this.items.set(currentItems);
    this.saveToCache();
  }

  async loadTransferForEditing(transferId: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { data: transfer } = await supabase.from('transfers').select('*').eq('id', transferId).single();
      if (!transfer || transfer.status !== 'pending') return false;

      const { data: details } = await supabase.from('transfer_details').select('*').eq('id_transfer', transferId);
      if (!details || details.length === 0) return false;

      const allProducts = this.catalogService.catalogProducts();
      const allModels = this.catalogService.catalogModels();
      const allColors = this.catalogService.colors();
      const allModelColors = this.catalogService.catalogModelColors();
      const allStocks = this.catalogService.catalogStocks();
      const origin = this.originId();

      const items: TransferItem[] = details.map((d) => {
        const product = allProducts.find((p) => p.id === d.id_product);
        const model = product ? allModels.find((m) => m.id === product.idClothingModel) : undefined;
        const color = product ? allColors.find((c) => c.id === product.idColor) : undefined;
        const imageUrl = model
          ? allModelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? ''
          : '';
        const stockAtOrigin = allStocks.find((s) => s.idProduct === d.id_product && s.idLocation === origin)?.currentStock ?? 0;

        return {
          modelId: model?.id ?? '',
          modelName: model?.name ?? 'Producto',
          imageUrl,
          colorId: product?.idColor ?? '',
          colorName: color?.name ?? '',
          size: product?.size ?? '',
          productId: d.id_product,
          stockAtOrigin: stockAtOrigin + d.quantity,
          quantity: d.quantity,
          salePrice: d.unit_price ?? product?.salePrice ?? 0,
        };
      });

      this.items.set(items);
      this.destinationId.set(transfer.id_destination);
      this.editingTransferId.set(transferId);
      return true;
    } catch (err) {
      console.error('Error loading transfer for editing:', err);
      return false;
    }
  }

  async editTransfer(oldTransferId: string): Promise<boolean> {
    const destId = this.destinationId();
    const currentItems = this.items();
    if (!destId || currentItems.length === 0) return false;

    const user = this.authService.currentUser();
    if (!user) return false;

    const supabase = getSupabase();
    const newTransferId = crypto.randomUUID();

    try {
      const p_items = currentItems.map((item) => ({
        id_product: item.productId,
        quantity: item.quantity,
        unit_price: item.salePrice,
      }));

      const { error } = await supabase.rpc('editar_traslado', {
        p_old_transfer_id: oldTransferId,
        p_id: newTransferId,
        p_id_origin: this.originId(),
        p_id_destination: destId,
        p_id_user_origin: user.id,
        p_items,
      });

      if (error) {
        console.error('Edit transfer error:', error);
        return false;
      }

      this.saveLastTransfer();
      this.clearCache();
      this.items.set([]);
      this.destinationId.set('');
      this.editingTransferId.set(null);
      this.catalogService.triggerRefresh();
      this.receptionService.refresh();
      return true;
    } catch (err) {
      console.error('Error in editTransfer:', err);
      return false;
    }
  }

  async confirmTransfer(): Promise<boolean> {
    const destId = this.destinationId();
    const currentItems = this.items();
    if (!destId || currentItems.length === 0) return false;

    const user = this.authService.currentUser();
    if (!user) return false;

    const transferId = crypto.randomUUID();

    try {
      const p_items = currentItems.map((item) => ({
        id_product: item.productId,
        quantity: item.quantity,
        unit_price: item.salePrice,
      }));

      const { error } = await getSupabase().rpc('confirmar_traslado', {
        p_id: transferId,
        p_id_origin: this.originId(),
        p_id_destination: destId,
        p_id_user_origin: user.id,
        p_items,
      });

      if (error) {
        console.error('Transfer error:', error);
        console.error('Transfer error message:', (error as Record<string, unknown>)?.message ?? 'no message');
        return false;
      }

      for (const item of currentItems) {
        await this.stockMovementService.logMovement(
          'out',
          item.productId,
          this.originId(),
          item.quantity,
          'transfer',
          transferId,
        );
      }

      this.saveLastTransfer();
      this.clearCache();
      this.items.set([]);
      this.destinationId.set('');
      this.catalogService.triggerRefresh();
      this.receptionService.refresh();
      return true;
    } catch (err) {
      console.error('Error in confirmTransfer:', err);
      return false;
    }
  }

  getLocations() {
    return this.catalogService.locations();
  }

  private saveLastTransfer(): void {
    const items = this.items();
    if (items.length === 0) return;
    const data = {
      destinationId: this.destinationId(),
      items: items.map((i) => ({ ...i })),
    };
    this.lastTransferData.set(data);
    sessionStorage.setItem(TransferService.LAST_CACHE_KEY, JSON.stringify(data));
  }

  private restoreLastTransfer(): void {
    const raw = sessionStorage.getItem(TransferService.LAST_CACHE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data.items) && data.items.length > 0 && data.destinationId) {
          this.lastTransferData.set(data);
          return;
        }
      } catch {
        sessionStorage.removeItem(TransferService.LAST_CACHE_KEY);
      }
    }
    this.loadLastTransferFromDb();
  }

  private async loadLastTransferFromDb(): Promise<void> {
    try {
      await this.authService.waitForInit();
      const user = this.authService.currentUser();
      if (!user) return;

      const supabase = getSupabase();

      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('id_user_origin', user.id)
        .order('date_time', { ascending: false })
        .limit(1);

      if (!transfers || transfers.length === 0) return;
      const transfer = transfers[0];
      const destId = transfer.id_destination;

      const { data: details } = await supabase
        .from('transfer_details')
        .select('*')
        .eq('id_transfer', transfer.id);

      if (!details || details.length === 0) return;

      const productIds = [...new Set(details.map((d: Record<string, unknown>) => d['id_product'] as string))];
      if (productIds.length === 0) return;

      const { data: rawProducts } = await supabase.from('products').select('*').in('id', productIds);
      if (!rawProducts || rawProducts.length === 0) return;
      const products = rawProducts.map((r: Record<string, unknown>) => toCamelCase<Product>(r));

      const modelIds = [...new Set(products.map((p) => p.idClothingModel))];
      const colorIds = [...new Set(products.map((p) => p.idColor))];

      const [{ data: rawModels }, { data: rawColors }, { data: rawModelColors }, { data: rawStocks }] = await Promise.all([
        supabase.from('clothing_models').select('*').in('id', modelIds),
        supabase.from('colors').select('*').in('id', colorIds),
        supabase.from('clothing_model_colors').select('*').in('id_clothing_model', modelIds),
        supabase.from('stock_locations').select('*').in('id_product', productIds),
      ]);

      const models = (rawModels ?? []).map((r: Record<string, unknown>) => toCamelCase<ClothingModel>(r));
      const colors = (rawColors ?? []).map((r: Record<string, unknown>) => toCamelCase<Color>(r));
      const modelColors = (rawModelColors ?? []).map((r: Record<string, unknown>) => toCamelCase<ClothingModelColor>(r));
      const stocks = (rawStocks ?? []).map((r: Record<string, unknown>) => toCamelCase<StockLocation>(r));

      const items: TransferItem[] = details.map((d: Record<string, unknown>) => {
        const product = products.find((p) => p.id === d['id_product']);
        const model = product ? models.find((m) => m.id === product.idClothingModel) : undefined;
        const color = product ? colors.find((c) => c.id === product.idColor) : undefined;
        const imageUrl = model
          ? modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? ''
          : '';
        const stockAtOrigin = stocks.find(
          (s) => s.idProduct === d['id_product'] && s.idLocation === this.originId(),
        )?.currentStock ?? 0;

        return {
          modelId: model?.id ?? '',
          modelName: model?.name ?? 'Producto',
          imageUrl,
          colorId: product?.idColor ?? '',
          colorName: color?.name ?? '',
          size: product?.size ?? '',
          productId: d['id_product'] as string,
          stockAtOrigin,
          quantity: d['quantity'] as number,
          salePrice: (d['unit_price'] as number) ?? product?.salePrice ?? 0,
        };
      });

      if (items.length === 0) return;

      const data = { destinationId: destId, items };
      this.lastTransferData.set(data);
      sessionStorage.setItem(TransferService.LAST_CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error loading last transfer from DB:', err);
    }
  }

  repeatLastTransfer(): void {
    const data = this.lastTransferData();
    if (!data) return;
    this.destinationId.set(data.destinationId);
    this.items.set(data.items.map((i) => ({ ...i })));
  }
}
