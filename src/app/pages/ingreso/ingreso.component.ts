import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { IngresoService, IngresoItem } from '../../core/services/ingreso.service';
import { getSupabase } from '../../core/services/supabase.service';
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
  imports: [ReactiveFormsModule, UpperCasePipe, MatIcon],
  templateUrl: './ingreso.component.html',
  styleUrl: './ingreso.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngresoComponent {
  private readonly router = inject(Router);
  private readonly catalogService = inject(CatalogService);
  private readonly ingresoService = inject(IngresoService);

  readonly mode = signal<'search' | 'create' | 'variants'>('search');

  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');
  readonly selectedCategoryId = signal<string | null>(null);

  readonly selectedModel = signal<ClothingModel | null>(null);
  readonly locallyCreatedProducts = signal<{ id: string; idColor: string; size: string }[]>([]);
  readonly variantQuantities = signal<Record<string, number>>({});
  readonly selectedLocationId = signal('');
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly selectedColors = signal<string[]>([]);
  readonly selectedSizes = signal<string[]>([]);
  readonly newColorName = signal('');
  readonly newSizeInput = signal('');

  get COLORS() { return this.catalogService.colors(); }
  get categories() { return this.catalogService.categories(); }
  get locations() { return this.catalogService.locations(); }

  getColorName(colorId: string): string {
    return this.catalogService.colors().find((c) => c.id === colorId)?.name ?? colorId;
  }

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
    const dbProducts = products.filter((p) => p.idClothingModel === model.id && p.active);
    const localProducts = this.locallyCreatedProducts();
    if (localProducts.length === 0) return dbProducts.map((p) => ({ id: p.id, idColor: p.idColor, size: p.size }));
    return localProducts;
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

  async addColor(): Promise<void> {
    const name = this.newColorName().trim();
    if (!name) return;

    const supabase = getSupabase();
    let colorId = this.COLORS.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    )?.id;
    if (!colorId) {
      colorId = crypto.randomUUID();
      const { error } = await supabase.from('colors').insert({
        id: colorId,
        name,
      });
      if (error) {
        console.error('Error creating color:', error);
        return;
      }
    }

    if (!this.selectedColors().includes(colorId)) {
      this.selectedColors.update((colors) => [...colors, colorId]);
    }
    this.newColorName.set('');
  }

  removeColor(colorId: string): void {
    this.selectedColors.update((colors) => colors.filter((c) => c !== colorId));
  }

  addSize(): void {
    const size = this.newSizeInput().trim();
    if (size && !this.selectedSizes().includes(size)) {
      this.selectedSizes.update((sizes) => [...sizes, size]);
    }
    this.newSizeInput.set('');
  }

  removeSize(size: string): void {
    this.selectedSizes.update((sizes) => sizes.filter((s) => s !== size));
  }

  switchToCreate(): void {
    this.mode.set('create');
  }

  async saveAndIngress(): Promise<void> {
    if (this.form.invalid) return;
    const colors = this.selectedColors();
    const sizes = this.selectedSizes();
    if (colors.length === 0 || sizes.length === 0) return;

    const supabase = getSupabase();
    const modelId = crypto.randomUUID();
    const price = this.form.controls.price.value ?? 0;

    const { error: modelError } = await supabase.from('clothing_models').insert({
      id: modelId,
      name: this.form.controls.name.value,
      id_category: this.form.controls.categoryId.value,
      description: null,
      created_at: new Date().toISOString(),
      active: true,
    });

    if (modelError) {
      console.error('Error creating model:', modelError);
      return;
    }

    const localProducts: { id: string; idColor: string; size: string }[] = [];

    for (const colorId of colors) {
      const { error: mcError } = await supabase
        .from('clothing_model_colors')
        .insert({
          id: crypto.randomUUID(),
          id_clothing_model: modelId,
          id_color: colorId,
          image_url: `https://placehold.co/400x400?text=Nuevo+Producto`,
        });

      if (mcError) {
        console.error('Error linking color:', mcError);
        return;
      }

      for (const size of sizes) {
        const productId = crypto.randomUUID();
        const { error: prodError } = await supabase
          .from('products')
          .insert({
            id: productId,
            id_clothing_model: modelId,
            size,
            id_color: colorId,
            cost_price: price,
            sale_price: price,
            active: true,
          });

        if (prodError) {
          console.error('Error creating product:', prodError);
          return;
        }

        localProducts.push({ id: productId, idColor: colorId, size });
      }
    }

    this.catalogService.triggerRefresh();

    const newModel: ClothingModel = {
      id: modelId,
      name: this.form.controls.name.value,
      idCategory: this.form.controls.categoryId.value,
      description: undefined,
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.locallyCreatedProducts.set(localProducts);
    this.form.reset({ name: '', price: null, categoryId: '' });
    this.selectedColors.set([]);
    this.selectedSizes.set([]);
    this.selectedModel.set(newModel);
    this.variantQuantities.set({});
    this.mode.set('variants');
  }

  async confirmIngreso(): Promise<void> {
    const model = this.selectedModel();
    if (!model || !this.canConfirm()) return;

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

    const ok = await this.ingresoService.confirmIngreso(items, locationId);

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
      setTimeout(() => this.confirmed.set(false), 3000);
    } else {
      this.error.set('Error al registrar el ingreso. Intente nuevamente.');
    }
  }
}
