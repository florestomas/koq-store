import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UpperCasePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SaleService, CartItem } from '../../core/services/sale.service';
import { getSupabase } from '../../core/services/supabase.service';
import { getColorHex } from '../../core/utils/colors';
import { ClothingModel } from '../../interfaces/clothing-model';
import { Category } from '../../interfaces/category';
import {
  ProductQuantityPickerDialogComponent,
  QuantityPickerData,
  QuantityPickerResult,
  QuantityPickerRow,
} from '../../shared/product-quantity-picker-dialog/product-quantity-picker-dialog.component';

interface SaleCache {
  cartItems: CartItem[];
  channel: 'local' | 'whatsapp' | null;
  surchargeMode: 'none' | 'percentage' | 'fixed';
  surchargeFixedValue: number;
}

export interface ModelSearchResult {
  model: ClothingModel;
  imageUrl: string;
  categoryName: string;
  totalStock: number;
}

@Component({
  selector: 'app-new-sale',
  imports: [ReactiveFormsModule, UpperCasePipe, DecimalPipe, MatIcon],
  templateUrl: './new-sale.component.html',
  styleUrl: './new-sale.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewSaleComponent {
  private static readonly CACHE_KEY = 'koq-sale-cache';

  private saveToCache(): void {
    try {
      sessionStorage.setItem(
        NewSaleComponent.CACHE_KEY,
        JSON.stringify({
          cartItems: this.cartItems(),
          channel: this.channel(),
          surchargeMode: this.surchargeMode(),
          surchargeFixedValue: this.surchargeFixedValue(),
        } satisfies SaleCache),
      );
    } catch {}
  }

  private restoreFromCache(): void {
    try {
      const raw = sessionStorage.getItem(NewSaleComponent.CACHE_KEY);
      if (!raw) return;
      const cached: SaleCache = JSON.parse(raw);
      if (cached.cartItems?.length) this.cartItems.set(cached.cartItems);
      if (cached.channel) this.channel.set(cached.channel);
      if (cached.surchargeMode) this.surchargeMode.set(cached.surchargeMode);
      this.surchargeFixedValue.set(cached.surchargeFixedValue ?? 0);
    } catch {}
  }

  private clearCache(): void {
    try {
      sessionStorage.removeItem(NewSaleComponent.CACHE_KEY);
    } catch {}
  }

  private readonly authService = inject(AuthService);
  readonly saleService = inject(SaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly catalogService = inject(CatalogService);
  private readonly dialog = inject(MatDialog);

  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly cartItems = signal<CartItem[]>([]);
  readonly channel = signal<'local' | 'whatsapp' | null>(null);
  readonly surchargeMode = signal<'none' | 'percentage' | 'fixed'>('none');
  readonly surchargeFixedValue = signal(0);
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);
  readonly showCanastoForm = signal(false);
  readonly canastoPrice = signal(0);
  readonly editingSaleId = signal<string | null>(null);
  readonly isEditing = computed(() => this.editingSaleId() !== null);

  readonly channels: ('local' | 'whatsapp')[] = [
    'local',
    'whatsapp',
  ];

  readonly userLocationId = computed(
    () => this.authService.currentUser()?.idLocation ?? '1',
  );
  readonly user = computed(() => this.authService.currentUser());

  readonly cartQuantities = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.cartItems()) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  });

  readonly availableModels = computed<ModelSearchResult[]>(() => {
    const locId = this.userLocationId();
    const models = this.catalogService.catalogModels();
    const products = this.catalogService.catalogProducts();
    const stocks = this.catalogService.catalogStocks();
    const modelColors = this.catalogService.catalogModelColors();
    const categories = this.catalogService.categories();
    const cartMap = this.cartQuantities();

    return models
      .filter((m) => m.active)
      .map((model) => {
        const modelProducts = products.filter(
          (p) => p.idClothingModel === model.id && p.active,
        );
        const productIds = modelProducts.map((p) => p.id);

        const stocksAtLocation = stocks.filter(
          (s) => productIds.includes(s.idProduct) && s.idLocation === locId,
        );

        const totalStock = stocksAtLocation.reduce(
          (sum, s) => sum + s.currentStock,
          0,
        );

        const cartTotal = productIds.reduce((sum, pid) => sum + (cartMap.get(pid) ?? 0), 0);

        const imageUrl =
          modelColors.find(
            (mc) => mc.idClothingModel === model.id,
          )?.imageUrl ?? '';

        const categoryName =
          categories.find((c) => c.id === model.idCategory)?.name ?? '';

        return { model, imageUrl, categoryName, totalStock: Math.max(0, totalStock - cartTotal) };
      })
      .filter((r) => r.totalStock > 0);
  });

  readonly filteredModels = computed<ModelSearchResult[]>(() => {
    const rawTerm = this.searchTerm().toLowerCase().trim();
    const term = rawTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catId = this.selectedCategoryId();
    let results = this.availableModels();

    if (term) {
      results = results.filter((r) =>
        r.model.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term),
      );
    }

    if (catId) {
      results = results.filter((r) => r.model.idCategory === catId);
    }

    return results;
  });

  readonly getColorHex = getColorHex;

  readonly categories = computed<Category[]>(() => {
    const categories = this.catalogService.categories();
    const modelIdsWithStock = new Set(
      this.availableModels().map((r) => r.model.idCategory),
    );
    return categories.filter((c) => modelIdsWithStock.has(c.id));
  });

  readonly totalBeforeDiscount = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
  );

  readonly surcharge = computed(() => {
    const mode = this.surchargeMode();
    if (mode === 'none') return 0;
    if (mode === 'percentage') return Math.round(this.totalBeforeDiscount() * 0.1);
    return this.surchargeFixedValue();
  });

  readonly total = computed(() =>
    Math.max(0, this.totalBeforeDiscount() + this.surcharge()),
  );

  readonly canConfirm = computed(
    () => this.channel() !== null && this.cartItems().length > 0,
  );

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const sub = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value ?? '');
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());

    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (editId) {
      this.loadSaleForEditing(editId);
    } else {
      this.restoreFromCache();
    }

    this.catalogService.triggerRefresh();
  }

  private async loadSaleForEditing(saleId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { data: sale } = await supabase.from('sales').select('*').eq('id', saleId).single();
      if (!sale || sale.status !== 'active') return;

      const { data: details } = await supabase.from('sale_details').select('*').eq('id_sale', saleId);
      if (!details) return;

      const products = this.catalogService.catalogProducts();
      const models = this.catalogService.catalogModels();
      const colors = this.catalogService.colors();
      const modelColors = this.catalogService.catalogModelColors();

      const items: CartItem[] = [];
      for (const d of details) {
        if (d.id_product) {
          const product = products.find((p) => p.id === d.id_product);
          const model = product ? models.find((m) => m.id === product.idClothingModel) : undefined;
          const color = product ? colors.find((c) => c.id === product.idColor) : undefined;
          const imageUrl = model
            ? modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? ''
            : '';
          items.push({
            productId: d.id_product,
            modelName: model?.name ?? 'Producto',
            colorName: color?.name ?? '',
            size: product?.size ?? '',
            quantity: d.quantity,
            unitPrice: d.unit_price,
            originalPrice: d.original_price ?? d.unit_price,
            imageUrl,
          });
        } else {
          items.push({
            productId: '',
            modelName: 'Canasto de ofertas',
            colorName: '',
            size: '',
            quantity: d.quantity,
            unitPrice: d.unit_price,
            originalPrice: d.unit_price,
            imageUrl: '',
          });
        }
      }

      this.cartItems.set(items);
      this.channel.set(sale.channel);
      this.editingSaleId.set(saleId);
    } catch (err) {
      console.error('Error loading sale for editing:', err);
    }
  }

  cancelEdit(): void {
    this.router.navigate(['/historial']);
  }

  repeatLastSale(): void {
    const data = this.saleService.repeatLastSale();
    if (!data) return;
    this.cartItems.set(data.items);
    this.channel.set(data.channel);
    this.saveToCache();
  }

  selectModel(model: ClothingModel): void {
    const products = this.catalogService.catalogProducts().filter(
      (p) => p.idClothingModel === model.id && p.active,
    );
    if (products.length === 0) return;

    const locId = this.userLocationId();
    const colors = this.catalogService.colors();
    const stocks = this.catalogService.catalogStocks();
    const cartMap = this.cartQuantities();
    const colorIds = [...new Set(products.map((p) => p.idColor))];
    const allSizes = [...new Set(products.map((p) => p.size))].sort(
      (a, b) => parseInt(a) - parseInt(b),
    );

    const modelColors = this.catalogService.catalogModelColors();
    const imageUrl = modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? '';

    const rows: QuantityPickerRow[] = colorIds.map((colorId) => {
      const colorName = colors.find((c) => c.id === colorId)?.name ?? colorId;
      const colorProducts = products.filter((p) => p.idColor === colorId);
      const cells = allSizes.map((size) => {
        const product = colorProducts.find((p) => p.size === size);
        if (!product) return { productId: null, size, stock: 0 };
        const dbStock =
          stocks.find((s) => s.idProduct === product.id && s.idLocation === locId)
            ?.currentStock ?? 0;
        const cartQty = cartMap.get(product.id) ?? 0;
        return { productId: product.id, size, stock: Math.max(0, dbStock - cartQty) };
      });
      return { colorName, cells };
    });

    const data: QuantityPickerData = {
      modelName: model.name,
      imageUrl,
      sizes: allSizes,
      rows,
      showStock: true,
    };

    const dialogRef = this.dialog.open<
      ProductQuantityPickerDialogComponent,
      QuantityPickerData,
      QuantityPickerResult
    >(ProductQuantityPickerDialogComponent, { data, maxWidth: '90vw' });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.addToCartFromPicker(model, result.quantities, imageUrl);
    });
  }

  private addToCartFromPicker(
    model: ClothingModel,
    quantities: Record<string, number>,
    imageUrl: string,
  ): void {
    const products = this.catalogService.catalogProducts();
    const colors = this.catalogService.colors();
    const items: CartItem[] = [];

    for (const [productId, qty] of Object.entries(quantities)) {
      if (qty <= 0) continue;
      const product = products.find((p) => p.id === productId);
      if (!product) continue;
      const colorName = colors.find((c) => c.id === product.idColor)?.name ?? '';

      const existing = this.cartItems().findIndex(
        (ci) => ci.productId === productId,
      );
      if (existing !== -1) {
        const current = [...this.cartItems()];
        current[existing] = {
          ...current[existing],
          quantity: current[existing].quantity + qty,
        };
        this.cartItems.set(current);
      } else {
        items.push({
          productId,
          modelName: model.name,
          colorName,
          size: product.size,
          quantity: qty,
          unitPrice: product.salePrice,
          originalPrice: product.salePrice,
          imageUrl,
        });
      }
    }

    if (items.length > 0) {
      this.cartItems.update((prev) => [...prev, ...items]);
    }

    this.saveToCache();
  }

  setSelectedCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
  }

  addCanasto(): void {
    const price = this.canastoPrice();
    if (price <= 0) return;
    this.error.set(null);
    this.cartItems.update((prev) => [
      ...prev,
      {
        productId: '',
        modelName: 'Canasto de ofertas',
        colorName: '',
        size: '',
        quantity: 1,
        unitPrice: price,
        originalPrice: price,
        imageUrl: '',
      },
    ]);
    this.canastoPrice.set(0);
    this.showCanastoForm.set(false);
    this.saveToCache();
  }

  changeQuantity(index: number, delta: number): void {
    const items = [...this.cartItems()];
    const item = items[index];
    if (!item) return;
    const isCanasto = item.productId === '';

    if (delta < 0) {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        items.splice(index, 1);
      } else {
        items[index] = { ...item, quantity: newQty };
      }
    } else {
      if (isCanasto) return;
      const stocks = this.catalogService.catalogStocks();
      const availableStock =
        stocks.find(
          (s) =>
            s.idProduct === item.productId &&
            s.idLocation === this.userLocationId(),
        )?.currentStock ?? 0;
      const cartQty =
        items.reduce(
          (sum, ci) => (ci.productId === item.productId ? sum + ci.quantity : sum),
          0,
        );
      if (cartQty < availableStock) {
        items[index] = { ...item, quantity: item.quantity + delta };
      }
    }
    this.cartItems.set(items);
    this.saveToCache();
  }

  removeItem(index: number): void {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.cartItems.set(items);
    this.saveToCache();
  }

  updateUnitPrice(index: number, newPrice: number): void {
    const items = [...this.cartItems()];
    if (newPrice <= 0) return;
    items[index] = { ...items[index], unitPrice: newPrice };
    this.cartItems.set(items);
    this.saveToCache();
  }

  selectChannel(ch: 'local' | 'whatsapp'): void {
    this.channel.set(ch);
    this.saveToCache();
  }

  setSurchargeMode(mode: 'none' | 'percentage' | 'fixed', fixedValue?: number): void {
    this.surchargeMode.set(mode);
    if (mode === 'fixed' && fixedValue !== undefined) {
      this.surchargeFixedValue.set(fixedValue);
    }
    this.saveToCache();
  }

  setSurchargeFixedValue(value: number): void {
    this.surchargeFixedValue.set(value);
    this.saveToCache();
  }

  parseNumber(value: string): number {
    return parseInt(value) || 0;
  }

  async confirmSale(): Promise<void> {
    const channel = this.channel();
    const items = this.cartItems();
    const user = this.user();
    if (!channel || items.length === 0 || !user) return;

    const stocks = this.catalogService.catalogStocks();
    const cartQuantities = this.cartQuantities();
    const editingId = this.editingSaleId();
    if (!editingId) {
      for (const item of items) {
        if (item.productId === '') continue;
        const dbStock =
          stocks.find(
            (s) => s.idProduct === item.productId && s.idLocation === user.idLocation,
          )?.currentStock ?? 0;
        const cartTotal = cartQuantities.get(item.productId) ?? 0;
        if (cartTotal > dbStock) {
          this.error.set(`Stock insuficiente para "${item.modelName} T.${item.size} ${item.colorName}". Disponible: ${dbStock}.`);
          return;
        }
      }
    }

    if (!window.confirm(this.isEditing() ? '¿Actualizar esta venta?' : '¿Confirmar esta venta?')) return;

    let ok: boolean;
    if (editingId) {
      ok = await this.saleService.editSale(editingId, {
        items,
        idLocation: user.idLocation,
        idUser: user.id,
        channel,
      });
    } else {
      ok = await this.saleService.confirmSale({
        items,
        idLocation: user.idLocation,
        idUser: user.id,
        channel,
      });
    }

    if (ok) {
      this.clearCache();
      this.confirmed.set(true);
      this.error.set(null);
      this.cartItems.set([]);
      this.channel.set(null);
      this.surchargeMode.set('none');
      this.surchargeFixedValue.set(0);
      this.searchControl.setValue('');
      this.searchTerm.set('');
      this.showCanastoForm.set(false);
      this.canastoPrice.set(0);
      this.catalogService.triggerRefresh();
      if (editingId) {
        this.editingSaleId.set(null);
        this.router.navigate(['/historial']);
      }
      setTimeout(() => this.confirmed.set(false), 3000);
    } else {
      this.error.set('Stock insuficiente o error al procesar la venta. Verificá disponibilidad e intentá de nuevo.');
    }
  }
}
