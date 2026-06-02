import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { UpperCasePipe } from '@angular/common';
import { CatalogItem } from '../../interfaces/catalog-item';
import { Category } from '../../interfaces/category';
import { Location } from '../../interfaces/location';
import { CatalogService } from '../../core/services/catalog.service';
import { getSupabase } from '../../core/services/supabase.service';

type TabName = 'basic' | 'stock' | 'variants';

export interface ProductEditModalData {
  item: CatalogItem;
  categories: Category[];
  locations: Location[];
  isAdmin: boolean;
}

@Component({
  selector: 'app-product-edit-modal',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIcon, UpperCasePipe],
  templateUrl: './product-edit-modal.component.html',
  styleUrl: './product-edit-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditModalComponent {
  readonly data: ProductEditModalData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ProductEditModalComponent>);
  private readonly catalogService = inject(CatalogService);

  readonly activeTab = signal<TabName>('basic');

  readonly tabs: { key: TabName; label: string }[] = [
    { key: 'basic', label: 'Datos básicos' },
    { key: 'stock', label: 'Stock' },
    { key: 'variants', label: 'Variantes' },
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
    description: new FormControl(this.model()?.description ?? ''),
    categoryId: new FormControl(this.model()?.idCategory ?? '', { nonNullable: true }),
  });

  readonly newSizeInput = signal('');

  readonly newColorName = signal('');

  private readonly variantsVersion = signal(0);

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

  readonly availableColors = computed(() => {
    const mc = this.modelColors();
    return this.allColors().filter((c) => !mc.some((m) => m.id === c.id));
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

  getMinStockForLocation(locationId: string): number {
    return this.getLocationStockEntry(locationId).reduce(
      (sum, s) => sum + s.minimumStock,
      0,
    );
  }

  async setMinStockForLocation(locationId: string, value: string): Promise<void> {
    const newMin = parseInt(value) || 0;
    const entries = this.getLocationStockEntry(locationId);
    const perProduct = Math.max(1, Math.floor(newMin / this.uniqueSizes().length));
    for (const entry of entries) {
      await getSupabase()
        .from('stock_locations')
        .update({ minimum_stock: perProduct })
        .eq('id', entry.id);
    }
    this.catalogService.triggerRefresh();
  }

  async setCurrentStockForLocation(locationId: string, value: string): Promise<void> {
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
    this.catalogService.triggerRefresh();
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

  async setCellCurrentStock(
    locationId: string,
    colorId: string,
    size: string,
    value: string,
  ): Promise<void> {
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
    this.catalogService.triggerRefresh();
  }

  async addColor(): Promise<void> {
    const name = this.newColorName().trim();
    if (!name) return;

    const supabase = getSupabase();
    const modelId = this.data.item.modelId;

    let colorId = this.allColors().find(
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
        image_url: `https://placehold.co/400x400?text=${encodeURIComponent(name)}`,
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
    this.catalogService.triggerRefresh();
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
    this.catalogService.triggerRefresh();
  }

  async addSize(): Promise<void> {
    const size = this.newSizeInput().trim();
    if (!size) return;

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
    this.catalogService.triggerRefresh();
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
    this.catalogService.triggerRefresh();
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
    const modelId = this.data.item.modelId;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('clothing_models')
      .update({
        name: this.form.controls.name.value,
        description: this.form.controls.description.value || undefined,
        id_category: this.form.controls.categoryId.value,
      })
      .eq('id', modelId);

    if (error) {
      console.error('Error saving model:', error);
      return;
    }

    this.catalogService.triggerRefresh();
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
