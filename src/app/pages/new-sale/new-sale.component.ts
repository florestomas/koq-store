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
import { ClothingModel } from '../../interfaces/clothing-model';

interface VariantCell {
  productId: string | null;
  size: string;
  stock: number;
}

interface VariantRow {
  colorName: string;
  cells: VariantCell[];
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
  readonly showDropdown = signal(false);
  readonly selectedModel = signal<ClothingModel | null>(null);
  readonly cartItems = signal<CartItem[]>([]);
  readonly discountType = signal<'none' | 'percentage' | 'fixed_amount'>('none');
  readonly discountValue = signal(0);
  readonly channel = signal<'local' | 'whatsapp' | 'mercadolibre' | null>(null);
  readonly confirmed = signal(false);

  readonly channels: ('local' | 'whatsapp' | 'mercadolibre')[] = [
    'local',
    'whatsapp',
    'mercadolibre',
  ];
  readonly error = signal<string | null>(null);

  readonly userLocationId = computed(
    () => this.authService.currentUser()?.idLocation ?? '1',
  );
  readonly user = computed(() => this.authService.currentUser());

  readonly searchResults = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return [];
    return CLOTHING_MODELS.filter(
      (m) => m.active && m.name.toLowerCase().includes(term),
    );
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

      return { colorName, cells };
    });
  });

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

  readonly total = computed(
    () => this.totalBeforeDiscount() - this.discountAmount(),
  );

  readonly canConfirm = computed(
    () => this.channel() !== null && this.cartItems().length > 0,
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value ?? '');
        this.showDropdown.set(!!value);
      });
  }

  selectModel(model: ClothingModel): void {
    this.selectedModel.set(model);
    this.showDropdown.set(false);
    this.searchControl.setValue('');
    this.searchTerm.set('');
  }

  clearModel(): void {
    this.selectedModel.set(null);
  }

  addToCart(cell: VariantCell): void {
    if (!cell.productId || cell.stock === 0) return;
    const model = this.selectedModel();
    if (!model) return;

    const existing = this.cartItems().findIndex(
      (item) => item.productId === cell.productId,
    );

    if (existing !== -1) {
      const items = [...this.cartItems()];
      const current = items[existing];
      if (current.quantity < cell.stock) {
        items[existing] = { ...current, quantity: current.quantity + 1 };
        this.cartItems.set(items);
      }
    } else {
      const unitPrice =
        PRODUCTS.find((p) => p.id === cell.productId)?.salePrice ?? 0;
      const colorName =
        this.variantGrid().find((r) =>
          r.cells.some((c) => c.productId === cell.productId),
        )?.colorName ?? '';

      this.cartItems.update((items) => [
        ...items,
        {
          productId: cell.productId!,
          modelName: model.name,
          colorName,
          size: cell.size,
          quantity: 1,
          unitPrice,
          imageUrl: this.modelImageUrl(),
        },
      ]);
    }
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

  selectChannel(ch: 'local' | 'whatsapp' | 'mercadolibre'): void {
    this.channel.set(ch);
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
      this.channel.set(null);
      this.discountType.set('none');
      this.discountValue.set(0);
      setTimeout(() => this.confirmed.set(false), 3000);
    } else {
      this.error.set('Error al procesar la venta. Intente nuevamente.');
    }
  }
}
