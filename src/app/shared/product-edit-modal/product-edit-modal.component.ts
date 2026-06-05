import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { CatalogItem } from '../../interfaces/catalog-item';
import { Category } from '../../interfaces/category';
import { Location } from '../../interfaces/location';
import { CatalogService } from '../../core/services/catalog.service';
import { getSupabase, uploadProductImage } from '../../core/services/supabase.service';
import { getColorHex } from '../../core/utils/colors';

type TabName = 'basic' | 'stock' | 'variants' | 'prices';

export interface ProductEditModalData {
  item: CatalogItem;
  categories: Category[];
  locations: Location[];
  isAdmin: boolean;
}

@Component({
  selector: 'app-product-edit-modal',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIcon, UpperCasePipe, DecimalPipe],
  templateUrl: './product-edit-modal.component.html',
  styleUrl: './product-edit-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditModalComponent {
  readonly data: ProductEditModalData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ProductEditModalComponent>);
  private readonly catalogService = inject(CatalogService);

  readonly getColorHex = getColorHex;

  readonly activeTab = signal<TabName>('basic');

  readonly isUploading = signal(false);
  readonly isAddingColor = signal(false);
  readonly isAddingSize = signal(false);
  readonly isSaving = signal(false);
  readonly displayImageUrl = signal(this.data.item.imageUrl);

  readonly tabs: { key: TabName; label: string }[] = [
    { key: 'basic', label: 'Datos básicos' },
    { key: 'stock', label: 'Stock' },
    { key: 'variants', label: 'Variantes' },
    { key: 'prices', label: 'Precios' },
  ];

  private readonly allModels = computed(() => this.catalogService.catalogModels());
  private readonly allProducts = computed(() => this.catalogService.catalogProducts());
  private readonly allStocks = computed(() => this.catalogService.catalogStocks());
  private readonly allColors = computed(() => this.catalogService.colors());
  private readonly allModelColors = computed(() => this.catalogService.catalogModelColors());

  private readonly model = computed(() =>
    this.allModels().find((m) => m.id === this.data.item.modelId),
  );

  readonly form = new FormGroup({
    name: new FormControl(this.model()?.name ?? '', { nonNullable: true }),
    categoryId: new FormControl(this.model()?.idCategory ?? '', { nonNullable: true }),
  });

  readonly duplicateName = computed(() => {
    const name = this.form.controls.name.value.trim().toLowerCase();
    if (!name) return false;
    return this.allModels().some(
      (m) => m.id !== this.data.item.modelId && m.name.toLowerCase() === name && m.active,
    );
  });

  readonly newSizeInput = signal('');

  readonly newColorName = signal('');

  private readonly variantsVersion = signal(0);

  private readonly pricesVersion = signal(0);

  readonly sizePrices = computed(() => {
    const _ = this.pricesVersion();
    const prods = this.allProducts().filter(
      (p) => p.idClothingModel === this.data.item.modelId && p.active,
    );
    const sizes = [...new Set(prods.map((p) => p.size))].sort(
      (a, b) => parseInt(a) - parseInt(b),
    );
    return sizes.map((size) => {
      const firstProd = prods.find((p) => p.size === size);
      return {
        size,
        salePrice: firstProd?.salePrice ?? 0,
        costPrice: firstProd?.costPrice ?? 0,
      };
    });
  });

  async updateSizePrice(size: string, value: string): Promise<void> {
    this.isSaving.set(true);
    try {
      const newPrice = Math.max(0, parseInt(value) || 0);
      const productIds = this.allProducts()
        .filter(
          (p) =>
            p.idClothingModel === this.data.item.modelId && p.size === size && p.active,
        )
        .map((p) => p.id);

      const supabase = getSupabase();
      for (const pid of productIds) {
        await supabase
          .from('products')
          .update({ sale_price: newPrice, cost_price: newPrice })
          .eq('id', pid);
      }
      this.pricesVersion.update((v) => v + 1);
      await this.catalogService.triggerRefresh();
    } finally {
      this.isSaving.set(false);
    }
  }

  readonly modelColors = computed(() => {
    const _v = this.variantsVersion();
    const prods = this.allProducts();
    const colors = this.allColors();
    const colorIds = [
      ...new Set(
        prods
          .filter((p) => p.idClothingModel === this.data.item.modelId && p.active)
          .map((p) => p.idColor),
      ),
    ];
    return colorIds.map((cid) => ({
      id: cid,
      name: colors.find((c) => c.id === cid)?.name ?? cid,
    }));
  });

  private readonly usedColorIds = computed(() => {
    return new Set(
      this.allProducts()
        .filter((p) => p.active)
        .map((p) => p.idColor),
    );
  });

  readonly availableColors = computed(() => {
    const modelId = this.data.item.modelId;
    const linkedIds = new Set(
      this.allModelColors()
        .filter((mc) => mc.idClothingModel === modelId)
        .map((mc) => mc.idColor),
    );
    const usedInProducts = this.usedColorIds();
    return this.allColors().filter(
      (c) => usedInProducts.has(c.id) && !linkedIds.has(c.id),
    );
  });

  readonly uniqueSizes = computed(() => {
    const _v = this.variantsVersion();
    const prods = this.allProducts();
    const sizes = [
      ...new Set(
        prods
          .filter(
            (p) => p.idClothingModel === this.data.item.modelId && p.active,
          )
          .map((p) => p.size),
      ),
    ];
    return sizes.sort((a, b) => parseInt(a) - parseInt(b));
  });

  getLocationStockEntry(locId: string) {
    const productIds = this.getModelProductIds();
    return this.allStocks().filter(
      (s) => productIds.includes(s.idProduct) && s.idLocation === locId,
    );
  }

  getStockForLocation(locationId: string): number {
    return this.getLocationStockEntry(locationId).reduce(
      (sum, s) => sum + s.currentStock,
      0,
    );
  }

  getColorStockForLocation(colorId: string, locationId: string): number {
    const productIds = this.allProducts()
      .filter(
        (p) =>
          p.idClothingModel === this.data.item.modelId &&
          p.active &&
          p.idColor === colorId,
      )
      .map((p) => p.id);
    return this.allStocks()
      .filter(
        (s) =>
          s.idLocation === locationId && productIds.includes(s.idProduct),
      )
      .reduce((sum, s) => sum + s.currentStock, 0);
  }

  async setCurrentStockForLocation(locationId: string, value: string): Promise<void> {
    this.isSaving.set(true);
    try {
      const newTotal = parseInt(value) || 0;
      const entries = this.getLocationStockEntry(locationId);
      if (entries.length === 0) return;
      const perProduct = Math.floor(newTotal / entries.length);
      let remainder = newTotal % entries.length;
      for (const entry of entries) {
        const newStock = perProduct + (remainder > 0 ? 1 : 0);
        await getSupabase()
          .from('stock_locations')
          .update({ current_stock: newStock })
          .eq('id', entry.id);
        if (remainder > 0) remainder--;
      }
      await this.catalogService.triggerRefresh();
    } finally {
      this.isSaving.set(false);
    }
  }

  getStockForColorSizeInLocation(
    colorId: string,
    size: string,
    locationId: string,
  ): number {
    const productIds = this.allProducts()
      .filter(
        (p) =>
          p.idClothingModel === this.data.item.modelId &&
          p.active &&
          p.idColor === colorId &&
          p.size === size,
      )
      .map((p) => p.id);
    return this.allStocks()
      .filter(
        (s) =>
          s.idLocation === locationId && productIds.includes(s.idProduct),
      )
      .reduce((sum, s) => sum + s.currentStock, 0);
  }

  getMinStockForColorSizeInLocation(
    colorId: string,
    size: string,
    locationId: string,
  ): number {
    const productIds = this.allProducts()
      .filter(
        (p) =>
          p.idClothingModel === this.data.item.modelId &&
          p.active &&
          p.idColor === colorId &&
          p.size === size,
      )
      .map((p) => p.id);
    return this.allStocks()
      .filter(
        (s) =>
          s.idLocation === locationId && productIds.includes(s.idProduct),
      )
      .reduce((sum, s) => sum + s.minimumStock, 0);
  }

  async setCellCurrentStock(
    locationId: string,
    colorId: string,
    size: string,
    value: string,
  ): Promise<void> {
    this.isSaving.set(true);
    try {
      const newStock = Math.max(0, parseInt(value) || 0);
      const productIds = this.allProducts()
        .filter(
          (p) =>
            p.idClothingModel === this.data.item.modelId &&
            p.active &&
            p.idColor === colorId &&
            p.size === size,
        )
        .map((p) => p.id);
      const supabase = getSupabase();
      const entries = this.allStocks().filter(
        (s) => productIds.includes(s.idProduct) && s.idLocation === locationId,
      );
      if (entries.length > 0) {
        for (const entry of entries) {
          await supabase
            .from('stock_locations')
            .update({ current_stock: newStock })
            .eq('id', entry.id);
        }
      } else if (productIds.length > 0) {
        await supabase.from('stock_locations').insert({
          id: crypto.randomUUID(),
          id_product: productIds[0],
          id_location: locationId,
          current_stock: newStock,
          minimum_stock: 1,
        });
      }
      await this.catalogService.triggerRefresh();
    } finally {
      this.isSaving.set(false);
    }
  }

  async setCellMinStock(
    locationId: string,
    colorId: string,
    size: string,
    value: string,
  ): Promise<void> {
    this.isSaving.set(true);
    try {
      const newMin = Math.max(0, parseInt(value) || 0);
      const productIds = this.allProducts()
        .filter(
          (p) =>
            p.idClothingModel === this.data.item.modelId &&
            p.active &&
            p.idColor === colorId &&
            p.size === size,
        )
        .map((p) => p.id);
      const supabase = getSupabase();
      const entries = this.allStocks().filter(
        (s) => productIds.includes(s.idProduct) && s.idLocation === locationId,
      );
      for (const entry of entries) {
        await supabase
          .from('stock_locations')
          .update({ minimum_stock: newMin })
          .eq('id', entry.id);
      }
      await this.catalogService.triggerRefresh();
    } finally {
      this.isSaving.set(false);
    }
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    try {
      const modelId = this.data.item.modelId;
      const storagePath = `${modelId}/${Date.now()}`;
      const url = await uploadProductImage(file, storagePath);

      const modelColors = this.allModelColors().filter(
        (mc) => mc.idClothingModel === modelId,
      );
      for (const mc of modelColors) {
        await getSupabase()
          .from('clothing_model_colors')
          .update({ image_url: url })
          .eq('id', mc.id);
      }

      this.displayImageUrl.set(url);
      await this.catalogService.triggerRefresh();
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  async addColor(): Promise<void> {
    const name = this.newColorName().trim();
    if (!name) return;
    if (this.isAddingColor()) return;

    this.isAddingColor.set(true);
    try {
      const supabase = getSupabase();
      const modelId = this.data.item.modelId;

      let colorId = this.allColors().find(
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
      }

      if (
        this.allModelColors().some(
          (mc) =>
            mc.idClothingModel === modelId && mc.idColor === colorId,
        )
      ) {
        this.newColorName.set('');
        return;
      }

      const existingProduct = this.allProducts().find(
        (p) => p.idClothingModel === modelId && p.active,
      );
      const costPrice = existingProduct?.costPrice ?? 0;
      const salePrice = existingProduct?.salePrice ?? 0;

      const { error: mcError } = await supabase
        .from('clothing_model_colors')
        .insert({
          id: crypto.randomUUID(),
          id_clothing_model: modelId,
          id_color: colorId,
          image_url: `https://placehold.co/400x400?text=${encodeURIComponent(name.toUpperCase())}`,
        });
      if (mcError) {
        console.error('Error linking color to model:', mcError);
        return;
      }

      for (const size of this.uniqueSizes()) {
        const { error: prodError } = await supabase
          .from('products')
          .insert({
            id: crypto.randomUUID(),
            id_clothing_model: modelId,
            size,
            id_color: colorId,
            cost_price: costPrice,
            sale_price: salePrice,
            active: true,
          });
        if (prodError) {
          console.error('Error creating product:', prodError);
          return;
        }
      }

      this.newColorName.set('');
      this.variantsVersion.update((v) => v + 1);
      await this.catalogService.triggerRefresh();
    } finally {
      this.isAddingColor.set(false);
    }
  }

  async removeColor(colorId: string): Promise<void> {
    const modelId = this.data.item.modelId;

    const hasStock = this.allStocks().some((s) => {
      const product = this.allProducts().find((p) => p.id === s.idProduct);
      return (
        product &&
        product.idClothingModel === modelId &&
        product.idColor === colorId &&
        product.active &&
        s.currentStock > 0
      );
    });

    if (hasStock) {
      alert('No se puede eliminar el color porque tiene stock en alguna ubicación.');
      return;
    }

    const supabase = getSupabase();

    const productIds = this.allProducts()
      .filter(
        (p) =>
          p.idClothingModel === modelId &&
          p.idColor === colorId &&
          p.active,
      )
      .map((p) => p.id);

    for (const pid of productIds) {
      const { error: pErr } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', pid);
      if (pErr) console.error('Error deactivating product:', pErr);
    }

    const mcEntries = this.allModelColors().filter(
      (mc) => mc.idClothingModel === modelId && mc.idColor === colorId,
    );
    for (const mc of mcEntries) {
      const { error: mcErr } = await supabase
        .from('clothing_model_colors')
        .delete()
        .eq('id', mc.id);
      if (mcErr) console.error('Error removing model-color link:', mcErr);
    }

    this.variantsVersion.update((v) => v + 1);
    await this.catalogService.triggerRefresh();

    const stillLinked = this.allModelColors().some((mc) => mc.idColor === colorId);
    if (!stillLinked) {
      await supabase.from('colors').delete().eq('id', colorId);
      await this.catalogService.triggerRefresh();
    }
  }

  async addSize(): Promise<void> {
    const size = this.newSizeInput().trim();
    if (!size) return;
    if (this.isAddingSize()) return;

    this.isAddingSize.set(true);
    try {
      const modelId = this.data.item.modelId;
      const existingProduct = this.allProducts().find(
        (p) => p.idClothingModel === modelId && p.active,
      );
      const costPrice = existingProduct?.costPrice ?? 0;
      const salePrice = existingProduct?.salePrice ?? 0;
      const supabase = getSupabase();

      for (const color of this.modelColors()) {
        const { error: prodError } = await supabase
          .from('products')
          .insert({
            id: crypto.randomUUID(),
            id_clothing_model: modelId,
            size,
            id_color: color.id,
            cost_price: costPrice,
            sale_price: salePrice,
            active: true,
          });
        if (prodError) {
          console.error('Error creating product for size:', prodError);
          return;
        }
      }

      this.newSizeInput.set('');
      this.variantsVersion.update((v) => v + 1);
      await this.catalogService.triggerRefresh();
    } finally {
      this.isAddingSize.set(false);
    }
  }

  async removeSize(size: string): Promise<void> {
    const modelId = this.data.item.modelId;

    const hasStock = this.allStocks().some((s) => {
      const product = this.allProducts().find((p) => p.id === s.idProduct);
      return (
        product &&
        product.idClothingModel === modelId &&
        product.size === size &&
        product.active &&
        s.currentStock > 0
      );
    });

    if (hasStock) {
      alert('No se puede eliminar el talle porque tiene stock en alguna ubicación.');
      return;
    }

    const supabase = getSupabase();

    const productIds = this.allProducts()
      .filter(
        (p) =>
          p.idClothingModel === modelId && p.size === size && p.active,
      )
      .map((p) => p.id);

    for (const pid of productIds) {
      const { error: pErr } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', pid);
      if (pErr) console.error('Error deactivating product:', pErr);
    }

    this.variantsVersion.update((v) => v + 1);
    await this.catalogService.triggerRefresh();
  }

  private getModelProductIds(): string[] {
    return this.allProducts()
      .filter(
        (p) => p.idClothingModel === this.data.item.modelId && p.active,
      )
      .map((p) => p.id);
  }

  selectTab(tab: TabName): void {
    this.activeTab.set(tab);
  }

  async save(): Promise<void> {
    if (this.duplicateName()) return;
    this.isSaving.set(true);
    try {
      const modelId = this.data.item.modelId;
      const supabase = getSupabase();

      const { error } = await supabase
        .from('clothing_models')
        .update({
          name: this.form.controls.name.value,
          id_category: this.form.controls.categoryId.value,
        })
        .eq('id', modelId);

      if (error) {
        console.error('Error saving model:', error);
        return;
      }

      await this.catalogService.triggerRefresh();
      this.dialogRef.close();
    } finally {
      this.isSaving.set(false);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  async deleteProduct(): Promise<void> {
    if (!window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;

    await this.catalogService.hardDeleteModel(this.data.item.modelId);
    this.dialogRef.close();
  }
}
