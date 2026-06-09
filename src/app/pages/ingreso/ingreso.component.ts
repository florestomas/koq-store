import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { IngresoService, IngresoItem } from '../../core/services/ingreso.service';
import { getColorHex } from '../../core/utils/colors';
import { StockMovementService } from '../../core/services/stock-movement.service';
import { ClothingModel } from '../../interfaces/clothing-model';
import { Category } from '../../interfaces/category';
import {
  ProductQuantityPickerDialogComponent,
  QuantityPickerData,
  QuantityPickerResult,
  QuantityPickerRow,
} from '../../shared/product-quantity-picker-dialog/product-quantity-picker-dialog.component';

interface ModelSearchResult {
  model: ClothingModel;
  imageUrl: string;
  categoryName: string;
}

@Component({
  selector: 'app-ingreso',
  imports: [ReactiveFormsModule, UpperCasePipe, MatIcon, RouterLink],
  templateUrl: './ingreso.component.html',
  styleUrl: './ingreso.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngresoComponent {
  private static readonly CACHE_KEY = 'koq-ingreso-cache';

  private readonly catalogService = inject(CatalogService);
  readonly ingresoService = inject(IngresoService);
  private readonly stockMovementService = inject(StockMovementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);

  readonly selectedLocationId = signal('');
  readonly resumenItems = signal<IngresoItem[]>([]);
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);
  readonly isConfirming = signal(false);
  readonly editingIngresoId = signal<string | null>(null);
  readonly isEditing = computed(() => this.editingIngresoId() !== null);

  get categories() { return this.catalogService.categories(); }
  get locations() { return this.catalogService.locations(); }

  readonly allModels = computed<ModelSearchResult[]>(() => {
    const models = this.catalogService.catalogModels();
    const modelColors = this.catalogService.catalogModelColors();
    const categories = this.catalogService.categories();
    return models
      .filter((m) => m.active)
      .map((model) => {
        const imageUrl =
          modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? '';
        const categoryName =
          categories.find((c) => c.id === model.idCategory)?.name ?? '';
        return { model, imageUrl, categoryName };
      });
  });

  readonly filteredModels = computed<ModelSearchResult[]>(() => {
    const rawTerm = this.searchTerm().toLowerCase().trim();
    const term = rawTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catId = this.selectedCategoryId();
    let results = this.allModels();
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

  readonly categoryTabs = computed<Category[]>(() => {
    const cats = this.catalogService.categories();
    return cats;
  });

  readonly getColorHex = getColorHex;

  readonly totalResumenItems = computed(() => this.resumenItems().length);
  readonly totalResumenUnits = computed(() =>
    this.resumenItems().reduce((sum, i) => sum + i.quantity, 0),
  );
  readonly canConfirm = computed(
    () => this.resumenItems().length > 0 && this.selectedLocationId() !== '',
  );

  constructor() {
    const sub = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value ?? '');
      });

    inject(DestroyRef).onDestroy(() => sub.unsubscribe());

    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (editId) {
      this.loadEditIfNeeded(editId);
    } else {
      this.restoreFromCache();
    }
  }

  private saveToCache(): void {
    const items = this.resumenItems();
    const locationId = this.selectedLocationId();
    if (items.length === 0) {
      sessionStorage.removeItem(IngresoComponent.CACHE_KEY);
      return;
    }
    sessionStorage.setItem(
      IngresoComponent.CACHE_KEY,
      JSON.stringify({ items, locationId }),
    );
  }

  private restoreFromCache(): void {
    const raw = sessionStorage.getItem(IngresoComponent.CACHE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.items) && data.items.length > 0) {
        this.resumenItems.set(data.items);
        if (data.locationId) this.selectedLocationId.set(data.locationId);
      } else {
        sessionStorage.removeItem(IngresoComponent.CACHE_KEY);
      }
    } catch {
      sessionStorage.removeItem(IngresoComponent.CACHE_KEY);
    }
  }

  private clearCache(): void {
    sessionStorage.removeItem(IngresoComponent.CACHE_KEY);
  }

  private async loadEditIfNeeded(editId: string): Promise<void> {
    const data = await this.ingresoService.loadIngresoForEditing(editId);
    if (!data) return;

    const products = this.catalogService.catalogProducts();
    const models = this.catalogService.catalogModels();
    const colors = this.catalogService.colors();
    const modelColors = this.catalogService.catalogModelColors();

    const items: IngresoItem[] = [];
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const model = models.find((m) => m.id === product.idClothingModel);
      const color = colors.find((c) => c.id === product.idColor);
      const imageUrl = model
        ? modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? ''
        : '';
      items.push({
        productId: item.productId,
        modelName: model?.name ?? 'Producto',
        colorName: color?.name ?? '',
        size: product.size,
        quantity: item.quantity,
        imageUrl,
      });
    }

    if (items.length === 0) return;

    this.selectedLocationId.set(data.locationId);
    this.resumenItems.set(items);
    this.editingIngresoId.set(data.referenceId);
  }

  cancelEdit(): void {
    this.editingIngresoId.set(null);
    this.resumenItems.set([]);
    this.selectedLocationId.set('');
    this.clearCache();
    this.router.navigate(['/historial']);
  }

  selectModel(model: ClothingModel): void {
    const products = this.catalogService.catalogProducts().filter(
      (p) => p.idClothingModel === model.id && p.active,
    );
    if (products.length === 0) return;

    const colors = this.catalogService.colors();
    const colorIds = [...new Set(products.map((p) => p.idColor))];
    const allSizes = [...new Set(products.map((p) => p.size))].sort(
      (a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      },
    );

    const modelColors = this.catalogService.catalogModelColors();
    const imageUrl = modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? '';

    const rows: QuantityPickerRow[] = colorIds.map((colorId) => {
      const colorName = colors.find((c) => c.id === colorId)?.name ?? colorId;
      const colorProducts = products.filter((p) => p.idColor === colorId);
      const cells = allSizes.map((size) => {
        const product = colorProducts.find((p) => p.size === size);
        return {
          productId: product ? product.id : null,
          size,
        };
      });
      return { colorName, cells };
    });

    const data: QuantityPickerData = {
      modelName: model.name,
      imageUrl,
      sizes: allSizes,
      rows,
      showStock: false,
    };

    const dialogRef = this.dialog.open<
      ProductQuantityPickerDialogComponent,
      QuantityPickerData,
      QuantityPickerResult
    >(ProductQuantityPickerDialogComponent, { data, maxWidth: '90vw' });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.addToResumenFromPicker(model, result.quantities);
    });
  }

  private addToResumenFromPicker(model: ClothingModel, quantities: Record<string, number>): void {
    const products = this.catalogService.catalogProducts();
    const colors = this.catalogService.colors();
    const modelColors = this.catalogService.catalogModelColors();
    const imageUrl = modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? '';

    const newItems: IngresoItem[] = [];

    for (const [productId, qty] of Object.entries(quantities)) {
      if (qty <= 0) continue;
      const product = products.find((p) => p.id === productId);
      if (!product) continue;
      const colorName = colors.find((c) => c.id === product.idColor)?.name ?? '';

      const existingIndex = this.resumenItems().findIndex(
        (ri) => ri.productId === productId,
      );
      if (existingIndex !== -1) {
        const current = [...this.resumenItems()];
        current[existingIndex] = {
          ...current[existingIndex],
          quantity: current[existingIndex].quantity + qty,
        };
        this.resumenItems.set(current);
      } else {
        newItems.push({
          productId,
          modelName: model.name,
          colorName,
          size: product.size,
          quantity: qty,
          imageUrl,
        });
      }
    }

    if (newItems.length > 0) {
      this.resumenItems.update((prev) => [...prev, ...newItems]);
    }

    this.saveToCache();
  }

  setSelectedCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
  }

  changeResumenQty(index: number, delta: number): void {
    const items = [...this.resumenItems()];
    const item = items[index];
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      items.splice(index, 1);
    } else {
      items[index] = { ...item, quantity: newQty };
    }
    this.resumenItems.set(items);
    this.saveToCache();
  }

  removeResumenItem(index: number): void {
    const items = [...this.resumenItems()];
    items.splice(index, 1);
    this.resumenItems.set(items);
    this.saveToCache();
  }

  setSelectedLocationId(value: string): void {
    this.selectedLocationId.set(value);
    this.saveToCache();
  }

  repeatLastIngreso(): void {
    const data = this.ingresoService.repeatLastIngreso();
    if (!data) return;
    this.resumenItems.set(data.items);
    this.selectedLocationId.set(data.locationId);
    this.saveToCache();
  }

  async confirmIngreso(): Promise<void> {
    if (!this.canConfirm() || this.isConfirming()) return;

    this.isConfirming.set(true);
    try {
      const items = this.resumenItems();
      const locationId = this.selectedLocationId();

      if (items.length === 0) return;

      let ok: boolean;
      const editingId = this.editingIngresoId();
      if (editingId) {
        ok = await this.ingresoService.editIngreso(editingId, items, locationId);
      } else {
        ok = await this.ingresoService.confirmIngreso(items, locationId);
      }

      if (ok) {
        this.confirmed.set(true);
        this.error.set(null);
        this.ingresoService.saveLastIngreso(items, locationId);
        this.resumenItems.set([]);
        this.selectedLocationId.set('');
        this.searchControl.setValue('');
        this.searchTerm.set('');
        this.selectedCategoryId.set(null);
        this.clearCache();
        await this.catalogService.triggerRefresh();
        this.stockMovementService.refresh();
        if (editingId) {
          this.editingIngresoId.set(null);
          this.router.navigate(['/historial']);
        }
        setTimeout(() => this.confirmed.set(false), 3000);
      } else {
        this.error.set('Error al registrar el ingreso. Intente nuevamente.');
      }
      } finally {
      this.isConfirming.set(false);
    }
  }
}
