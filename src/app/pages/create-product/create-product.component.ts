import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { CatalogService } from '../../core/services/catalog.service';
import { getSupabase, uploadProductImage } from '../../core/services/supabase.service';

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
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly selectedColors = signal<string[]>([]);
  readonly selectedSizes = signal<string[]>([]);
  readonly newSizeInput = signal('');
  readonly newColorName = signal('');
  readonly selectedImage = signal<File | null>(null);
  readonly imagePreview = signal('');
  readonly isSaving = signal(false);
  readonly isAddingColor = signal(false);
  readonly isAddingSize = signal(false);

  readonly duplicateName = computed(() => {
    const name = this.form.controls.name.value.trim().toLowerCase();
    if (!name) return false;
    return this.catalogService.catalogModels().some(
      (m) => m.name.toLowerCase() === name && m.active,
    );
  });

  get COLORS() { return this.catalogService.colors(); }
  get categories() { return this.catalogService.categories(); }

  readonly usedColors = computed(() => {
    const allColors = this.COLORS;
    const usedColorIds = new Set(
      this.catalogService.catalogProducts().filter((p) => p.active).map((p) => p.idColor),
    );
    return allColors.filter((c) => usedColorIds.has(c.id));
  });

  readonly stockValues = signal<Record<string, Record<string, number>>>({});

  readonly pricesBySize = signal<Record<string, number>>({});

  readonly allSizesHavePrice = computed(() => {
    const sizes = this.selectedSizes();
    if (sizes.length === 0) return false;
    const prices = this.pricesBySize();
    return sizes.every((s) => (prices[s] ?? 0) > 0);
  });

  setPrice(size: string, value: string): void {
    const price = parseInt(value) || 0;
    this.pricesBySize.update((p) => ({ ...p, [size]: price }));
  }

  getPrice(size: string): number {
    return this.pricesBySize()[size] ?? 0;
  }

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
    if (this.isAddingColor()) return;

    this.isAddingColor.set(true);
    try {
      const supabase = getSupabase();
      let colorId = this.COLORS.find(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )?.id;
      if (!colorId) {
        colorId = crypto.randomUUID();
        const { error } = await supabase.from('colors').insert({
          id: colorId,
          name: name.toUpperCase(),
        });
        if (error) {
          console.error('Error creating color:', error);
          return;
        }
        await this.catalogService.triggerRefresh();
      }

      if (!this.selectedColors().includes(colorId)) {
        this.selectedColors.update((colors) => [...colors, colorId]);
      }
      this.newColorName.set('');
    } finally {
      this.isAddingColor.set(false);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedImage.set(file);
      this.imagePreview.set(URL.createObjectURL(file));
    }
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
    this.pricesBySize.update((p) => {
      const next = { ...p };
      delete next[size];
      return next;
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    if (this.duplicateName()) return;
    const colors = this.selectedColors();
    const sizes = this.selectedSizes();
    if (colors.length === 0 || sizes.length === 0) return;
    if (!this.allSizesHavePrice()) return;
    if (this.isSaving()) return;

    this.isSaving.set(true);
    try {
      const supabase = getSupabase();
      const modelId = crypto.randomUUID();
      const pricesRec = this.pricesBySize();
      const stockRec = this.stockValues();

      let imageUrl = `https://placehold.co/400x400?text=Nuevo+Producto`;
      const imageFile = this.selectedImage();
      if (imageFile) {
        try {
          imageUrl = await uploadProductImage(imageFile, `${modelId}/main`);
        } catch (err) {
          console.error('Error uploading image:', err);
        }
      }

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
            image_url: imageUrl,
          });

        if (mcError) {
          console.error('Error linking color:', mcError);
          return;
        }

        for (const size of sizes) {
          const productId = crypto.randomUUID();
          const sizePrice = pricesRec[size] ?? 0;
          const { error: prodError } = await supabase
            .from('products')
            .insert({
              id: productId,
              id_clothing_model: modelId,
              size,
              id_color: colorId,
              cost_price: sizePrice,
              sale_price: sizePrice,
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
    } finally {
      this.isSaving.set(false);
    }
  }
}
