import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { IngresoService, IngresoItem } from '../../core/services/ingreso.service';
import { ClothingModel } from '../../interfaces/clothing-model';
import { Category } from '../../interfaces/category';

interface VariantCell {
  productId: string | null;
  size: string;
}

interface VariantRow {
  colorName: string;
  cells: VariantCell[];
}

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
  private readonly catalogService = inject(CatalogService);
  private readonly ingresoService = inject(IngresoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly mode = signal<'search' | 'variants'>('search');

  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);

  readonly selectedModel = signal<ClothingModel | null>(null);
  readonly variantQuantities = signal<Record<string, number>>({});
  readonly selectedLocationId = signal('');
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
    const term = this.searchTerm().toLowerCase().trim();
    const catId = this.selectedCategoryId();
    let results = this.allModels();
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

  readonly categoryTabs = computed<Category[]>(() => {
    const cats = this.catalogService.categories();
    return cats;
  });

  readonly modelImageUrl = computed(() => {
    const model = this.selectedModel();
    if (!model) return '';
    const modelColors = this.catalogService.catalogModelColors();
    return (
      modelColors.find((mc) => mc.idClothingModel === model.id)?.imageUrl ?? ''
    );
  });

  readonly modelProducts = computed(() => {
    const model = this.selectedModel();
    if (!model) return [];
    const products = this.catalogService.catalogProducts();
    return products
      .filter((p) => p.idClothingModel === model.id && p.active)
      .map((p) => ({ id: p.id, idColor: p.idColor, size: p.size }));
  });

  readonly allSizes = computed(() => {
    const products = this.modelProducts();
    return [...new Set(products.map((p) => p.size))].sort(
      (a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      },
    );
  });

  readonly variantGrid = computed<VariantRow[]>(() => {
    const products = this.modelProducts();
    const sizes = this.allSizes();
    const colors = this.catalogService.colors();
    const colorIds = [...new Set(products.map((p) => p.idColor))];

    return colorIds.map((colorId) => {
      const colorName = colors.find((c) => c.id === colorId)?.name ?? colorId;
      const colorProducts = products.filter((p) => p.idColor === colorId);
      const cells: VariantCell[] = sizes.map((size) => {
        const product = colorProducts.find((p) => p.size === size);
        if (!product) return { productId: null, size };
        return { productId: product.id, size };
      });
      return { colorName, cells };
    });
  });

  readonly totalUnits = computed(() => {
    const quantities = this.variantQuantities();
    return Object.values(quantities).reduce((sum, q) => sum + q, 0);
  });

  readonly canConfirm = computed(
    () => this.totalUnits() > 0 && this.selectedLocationId() !== '',
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value ?? '');
      });

    this.loadEditIfNeeded();
  }

  private async loadEditIfNeeded(): Promise<void> {
    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (!editId) return;

    const data = await this.ingresoService.loadIngresoForEditing(editId);
    if (!data) return;

    const products = this.catalogService.catalogProducts();
    const modelIds = new Set<string>();
    const quantities: Record<string, number> = {};

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        modelIds.add(product.idClothingModel);
        quantities[item.productId] = (quantities[item.productId] ?? 0) + item.quantity;
      }
    }

    if (modelIds.size === 0) return;

    const models = this.catalogService.catalogModels();
    const model = models.find((m) => modelIds.has(m.id) && m.active);
    if (!model) return;

    this.selectedLocationId.set(data.locationId);
    this.variantQuantities.set(quantities);
    this.selectedModel.set(model);
    this.mode.set('variants');
    this.editingIngresoId.set(data.referenceId);
  }

  cancelEdit(): void {
    this.editingIngresoId.set(null);
    this.variantQuantities.set({});
    this.selectedModel.set(null);
    this.selectedLocationId.set('');
    this.mode.set('search');
    this.router.navigate(['/historial']);
  }

  selectModel(model: ClothingModel): void {
    this.selectedModel.set(model);
    this.variantQuantities.set({});
    this.mode.set('variants');
  }

  setSelectedCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
  }

  clearModel(): void {
    this.selectedModel.set(null);
    this.variantQuantities.set({});
    this.mode.set('search');
  }

  setVariantQty(productId: string, rawValue: string): void {
    const value = Math.max(parseInt(rawValue) || 0, 0);
    this.variantQuantities.update((map) => ({ ...map, [productId]: value }));
  }

  getVariantQty(productId: string): number {
    return this.variantQuantities()[productId] ?? 0;
  }

  async confirmIngreso(): Promise<void> {
    const model = this.selectedModel();
    if (!model || !this.canConfirm() || this.isConfirming()) return;

    this.isConfirming.set(true);
    try {
      const quantities = this.variantQuantities();
      const locationId = this.selectedLocationId();
      const colors = this.catalogService.colors();
      const products = this.catalogService.catalogProducts();
      const modelProducts = products.filter(
        (p) => p.idClothingModel === model.id && p.active,
      );

      const items: IngresoItem[] = [];

      for (const row of this.variantGrid()) {
        for (const cell of row.cells) {
          if (!cell.productId) continue;
          const qty = quantities[cell.productId] ?? 0;
          if (qty <= 0) continue;

          items.push({
            productId: cell.productId,
            modelName: model.name,
            colorName: row.colorName,
            size: cell.size,
            quantity: qty,
            imageUrl: this.modelImageUrl(),
          });
        }
      }

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
        this.variantQuantities.set({});
        this.selectedModel.set(null);
        this.selectedLocationId.set('');
        this.mode.set('search');
        this.searchControl.setValue('');
        this.searchTerm.set('');
        this.selectedCategoryId.set(null);
        this.catalogService.triggerRefresh();
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
