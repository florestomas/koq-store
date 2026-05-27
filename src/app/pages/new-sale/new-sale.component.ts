import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UpperCasePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SaleService, CartItem } from '../../core/services/sale.service';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { COLORS } from '../../mocks/colors.mock';
import { CLOTHING_MODEL_COLORS } from '../../mocks/clothing-model-colors.mock';
import { CATEGORIES } from '../../mocks/category.mock';
import { ClothingModel } from '../../interfaces/clothing-model';
import { Category } from '../../interfaces/category';

interface VariantCell {
  productId: string | null;
  size: string;
  stock: number;
}

interface VariantRow {
  colorId: string;
  colorName: string;
  cells: VariantCell[];
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
  private readonly authService = inject(AuthService);
  private readonly saleService = inject(SaleService);

  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly selectedModel = signal<ClothingModel | null>(null);
  readonly cartItems = signal<CartItem[]>([]);
  readonly discountType = signal<'none' | 'percentage' | 'fixed_amount'>('none');
  readonly discountValue = signal(0);
  readonly channel = signal<'local' | 'whatsapp' | null>(null);
  readonly paymentTransfer = signal(false);
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);
  readonly variantQuantities = signal<Record<string, number>>({});

  readonly channels: ('local' | 'whatsapp')[] = [
    'local',
    'whatsapp',
  ];

  readonly userLocationId = computed(
    () => this.authService.currentUser()?.idLocation ?? '1',
  );
  readonly user = computed(() => this.authService.currentUser());

  readonly availableModels = computed<ModelSearchResult[]>(() => {
    const locId = this.userLocationId();

    return CLOTHING_MODELS.filter((m) => m.active)
      .map((model) => {
        const modelProducts = PRODUCTS.filter(
          (p) => p.idClothingModel === model.id && p.active,
        );
        const productIds = modelProducts.map((p) => p.id);

        const stocksAtLocation = STOCK_LOCATIONS.filter(
          (s) => productIds.includes(s.idProduct) && s.idLocation === locId,
        );

        const totalStock = stocksAtLocation.reduce(
          (sum, s) => sum + s.currentStock,
          0,
        );

        const imageUrl =
          CLOTHING_MODEL_COLORS.find(
            (mc) => mc.idClothingModel === model.id,
          )?.imageUrl ?? '';

        const categoryName =
          CATEGORIES.find((c) => c.id === model.idCategory)?.name ?? '';

        return { model, imageUrl, categoryName, totalStock };
      })
      .filter((r) => r.totalStock > 0);
  });

  readonly filteredModels = computed<ModelSearchResult[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const catId = this.selectedCategoryId();
    let results = this.availableModels();

    if (term) {
      results = results.filter((r) =>
        r.model.name.toLowerCase().includes(term),
      );
    }

    if (catId) {
      results = results.filter((r) => r.model.idCategory === catId);
    }

    return results;
  });

  readonly categories = computed<Category[]>(() => {
    const locId = this.userLocationId();
    const modelIdsWithStock = new Set(
      this.availableModels().map((r) => r.model.idCategory),
    );
    return CATEGORIES.filter((c) => modelIdsWithStock.has(c.id));
  });

  readonly modelImageUrl = computed(() => {
    const model = this.selectedModel();
    if (!model) return '';
    return (
      CLOTHING_MODEL_COLORS.find((mc) => mc.idClothingModel === model.id)
        ?.imageUrl ?? ''
    );
  });

  readonly modelProducts = computed(() => {
    const model = this.selectedModel();
    if (!model) return [];
    return PRODUCTS.filter(
      (p) => p.idClothingModel === model.id && p.active,
    );
  });

  readonly modelTotalStock = computed(() => {
    const products = this.modelProducts();
    const locId = this.userLocationId();
    return STOCK_LOCATIONS.filter(
      (s) =>
        products.some((p) => p.id === s.idProduct) &&
        s.idLocation === locId,
    ).reduce((sum, s) => sum + s.currentStock, 0);
  });

  readonly allSizes = computed(() => {
    const products = this.modelProducts();
    return [...new Set(products.map((p) => p.size))].sort(
      (a, b) => parseInt(a) - parseInt(b),
    );
  });

  readonly variantGrid = computed<VariantRow[]>(() => {
    const products = this.modelProducts();
    const locId = this.userLocationId();
    const sizes = this.allSizes();
    const colorIds = [...new Set(products.map((p) => p.idColor))];

    return colorIds.map((colorId) => {
      const colorName = COLORS.find((c) => c.id === colorId)?.name ?? colorId;
      const colorProducts = products.filter((p) => p.idColor === colorId);

      const cells: VariantCell[] = sizes.map((size) => {
        const product = colorProducts.find((p) => p.size === size);
        if (!product) return { productId: null, size, stock: 0 };
        const stock =
          STOCK_LOCATIONS.find(
            (s) => s.idProduct === product.id && s.idLocation === locId,
          )?.currentStock ?? 0;
        return { productId: product.id, size, stock };
      });

      return { colorId, colorName, cells };
    });
  });

  readonly totalAddingUnits = computed(() => {
    const quantities = this.variantQuantities();
    return Object.values(quantities).reduce((sum, q) => sum + q, 0);
  });

  readonly canAddToCart = computed(() => this.totalAddingUnits() > 0);

  readonly totalBeforeDiscount = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
  );

  readonly discountAmount = computed(() => {
    const type = this.discountType();
    const value = this.discountValue();
    if (type === 'none' || !value) return 0;
    if (type === 'percentage') return this.totalBeforeDiscount() * (value / 100);
    return value;
  });

  readonly surcharge = computed(() => {
    if (!this.paymentTransfer()) return 0;
    return Math.round(this.totalBeforeDiscount() * 0.1);
  });

  readonly total = computed(
    () => this.totalBeforeDiscount() - this.discountAmount() + this.surcharge(),
  );

  readonly canConfirm = computed(
    () => this.channel() !== null && this.cartItems().length > 0,
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value ?? '');
        this.selectedModel.set(null);
        this.variantQuantities.set({});
      });
  }

  selectModel(model: ClothingModel): void {
    this.selectedModel.set(model);
    this.variantQuantities.set({});
  }

  setSelectedCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
    this.selectedModel.set(null);
    this.variantQuantities.set({});
  }

  clearModel(): void {
    this.selectedModel.set(null);
    this.variantQuantities.set({});
  }

  setVariantQty(productId: string, rawValue: string): void {
    const value = Math.max(parseInt(rawValue) || 0, 0);
    this.variantQuantities.update((map) => ({ ...map, [productId]: value }));
  }

  getVariantQty(productId: string): number {
    return this.variantQuantities()[productId] ?? 0;
  }

  addToCart(): void {
    const model = this.selectedModel();
    if (!model || !this.canAddToCart()) return;

    const quantities = this.variantQuantities();
    const items: CartItem[] = [];

    for (const row of this.variantGrid()) {
      for (const cell of row.cells) {
        if (!cell.productId) continue;
        const qty = quantities[cell.productId] ?? 0;
        if (qty <= 0) continue;

        const product = PRODUCTS.find((p) => p.id === cell.productId);
        if (!product) continue;

        const existing = this.cartItems().findIndex(
          (ci) => ci.productId === cell.productId,
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
            productId: cell.productId,
            modelName: model.name,
            colorName: row.colorName,
            size: cell.size,
            quantity: qty,
            unitPrice: product.salePrice,
            imageUrl: this.modelImageUrl(),
          });
        }
      }
    }

    if (items.length > 0) {
      this.cartItems.update((prev) => [...prev, ...items]);
    }

    this.variantQuantities.set({});
  }

  changeQuantity(index: number, delta: number): void {
    const items = [...this.cartItems()];
    const item = items[index];
    if (!item) return;

    if (delta < 0) {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        items.splice(index, 1);
      } else {
        items[index] = { ...item, quantity: newQty };
      }
    } else {
      const availableStock =
        STOCK_LOCATIONS.find(
          (s) =>
            s.idProduct === item.productId &&
            s.idLocation === this.userLocationId(),
        )?.currentStock ?? 0;
      if (item.quantity < availableStock) {
        items[index] = { ...item, quantity: item.quantity + delta };
      }
    }
    this.cartItems.set(items);
  }

  removeItem(index: number): void {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.cartItems.set(items);
  }

  cycleDiscountMode(): void {
    const modes: ('none' | 'percentage' | 'fixed_amount')[] = [
      'none',
      'percentage',
      'fixed_amount',
    ];
    const current = this.discountType();
    const nextIndex = (modes.indexOf(current) + 1) % modes.length;
    this.discountType.set(modes[nextIndex]);
    if (modes[nextIndex] === 'none') this.discountValue.set(0);
  }

  selectChannel(ch: 'local' | 'whatsapp'): void {
    this.channel.set(ch);
  }

  togglePaymentTransfer(): void {
    this.paymentTransfer.update((v) => !v);
  }

  parseNumber(value: string): number {
    return parseInt(value) || 0;
  }

  confirmSale(): void {
    const channel = this.channel();
    const items = this.cartItems();
    const user = this.user();
    if (!channel || items.length === 0 || !user) return;

    const ok = this.saleService.confirmSale({
      items,
      idLocation: user.idLocation,
      idUser: user.id,
      channel,
      discountType:
        this.discountType() === 'none'
          ? undefined
          : (this.discountType() as 'percentage' | 'fixed_amount'),
      discountValue:
        this.discountType() === 'none' ? undefined : this.discountValue(),
    });

    if (ok) {
      this.confirmed.set(true);
      this.error.set(null);
      this.cartItems.set([]);
      this.selectedModel.set(null);
      this.variantQuantities.set({});
      this.channel.set(null);
      this.paymentTransfer.set(false);
      this.discountType.set('none');
      this.discountValue.set(0);
      this.searchControl.setValue('');
      this.searchTerm.set('');
      setTimeout(() => this.confirmed.set(false), 3000);
    } else {
      this.error.set('Error al procesar la venta. Intente nuevamente.');
    }
  }
}
