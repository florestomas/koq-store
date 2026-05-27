import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { CatalogService } from '../../core/services/catalog.service';
import { getSupabase } from '../../core/services/supabase.service';

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

  get COLORS() { return this.catalogService.colors(); }
  get categories() { return this.catalogService.categories(); }

  readonly stockValues = signal<Record<string, Record<string, number>>>({});

  getColorName(colorId: string): string {
    return this.COLORS.find((c) => c.id === colorId)?.name ?? colorId;
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

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const colors = this.selectedColors();
    const sizes = this.selectedSizes();
    if (colors.length === 0 || sizes.length === 0) return;

    const supabase = getSupabase();
    const modelId = crypto.randomUUID();
    const price = this.form.controls.price.value ?? 0;
    const stockRec = this.stockValues();

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

        const qty = stockRec[colorId]?.[size] ?? 0;
        const { error: stockError } = await supabase
          .from('stock_locations')
          .insert({
            id: crypto.randomUUID(),
            id_product: productId,
            id_location: '1',
            current_stock: qty,
            minimum_stock: 1,
          });

        if (stockError) {
          console.error('Error creating stock record:', stockError);
          return;
        }
      }
    }

    this.catalogService.triggerRefresh();
    this.router.navigate(['/catalogo']);
  }
}
