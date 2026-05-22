import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { CATEGORIES } from '../../mocks/category.mock';
import { COLORS } from '../../mocks/colors.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { CLOTHING_MODEL_COLORS } from '../../mocks/clothing-model-colors.mock';
import { CatalogService } from '../../core/services/catalog.service';

@Component({
  selector: 'app-create-product',
  imports: [ReactiveFormsModule, MatIcon, UpperCasePipe],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateProductComponent {
  private readonly router = inject(Router);
  private readonly catalogService = inject(CatalogService);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly selectedColors = signal<string[]>([]);
  readonly selectedSizes = signal<string[]>([]);
  readonly newSizeInput = signal('');
  readonly newColorName = signal('');

  readonly COLORS = COLORS;

  readonly stockValues = signal<Record<string, Record<string, number>>>({});

  readonly categories = signal(CATEGORIES);

  getColorName(colorId: string): string {
    return COLORS.find((c) => c.id === colorId)?.name ?? colorId;
  }

  setStock(colorId: string, size: string, value: string): void {
    const qty = parseInt(value) || 0;
    this.stockValues.update((st) => {
      const next = { ...st };
      if (!next[colorId]) next[colorId] = {};
      next[colorId] = { ...next[colorId], [size]: qty };
      return next;
    });
  }

  getStock(colorId: string, size: string): number {
    return this.stockValues()[colorId]?.[size] ?? 0;
  }

  addColor(): void {
    const name = this.newColorName().trim();
    if (!name) return;

    let colorId = COLORS.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;
    if (!colorId) {
      colorId = String(Math.max(...COLORS.map((c) => parseInt(c.id)), 0) + 1);
      COLORS.push({ id: colorId, name });
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

  save(): void {
    if (this.form.invalid) return;
    const colors = this.selectedColors();
    const sizes = this.selectedSizes();
    if (colors.length === 0 || sizes.length === 0) return;

    const modelId = String(Math.max(...CLOTHING_MODELS.map((m) => parseInt(m.id)), 0) + 1);
    const price = this.form.controls.price.value ?? 0;
    const stockRec = this.stockValues();

    CLOTHING_MODELS.push({
      id: modelId,
      name: this.form.controls.name.value,
      idCategory: this.form.controls.categoryId.value,
      description: undefined,
      createdAt: new Date().toISOString(),
      active: true,
    });

    for (const colorId of colors) {
      CLOTHING_MODEL_COLORS.push({
        id: String(Math.max(...CLOTHING_MODEL_COLORS.map((mc) => parseInt(mc.id)), 0) + 1),
        idClothingModel: modelId,
        idColor: colorId,
        imageUrl: `https://placehold.co/400x400?text=Nuevo+Producto`,
      });

      for (const size of sizes) {
        const productId = String(Math.max(...PRODUCTS.map((p) => parseInt(p.id)), 0) + 1);
        PRODUCTS.push({
          id: productId,
          idClothingModel: modelId,
          size,
          idColor: colorId,
          costPrice: price,
          salePrice: price,
          active: true,
        });

        const qty = stockRec[colorId]?.[size] ?? 0;
        STOCK_LOCATIONS.push({
          id: String(Math.max(...STOCK_LOCATIONS.map((s) => parseInt(s.id)), 0) + 1),
          idProduct: productId,
          idLocation: '1',
          currentStock: qty,
          minimumStock: 1,
        });
      }
    }

    this.catalogService.triggerRefresh();
    this.router.navigate(['/catalogo']);
  }
}
