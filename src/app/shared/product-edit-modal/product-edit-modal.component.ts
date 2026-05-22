import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { UpperCasePipe } from '@angular/common';
import { CatalogItem } from '../../interfaces/catalog-item';
import { Category } from '../../interfaces/category';
import { Location } from '../../interfaces/location';
import { COLORS } from '../../mocks/colors.mock';
import { CLOTHING_MODELS } from '../../mocks/clothing-models.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { CLOTHING_MODEL_COLORS } from '../../mocks/clothing-model-colors.mock';
import { LOCATIONS } from '../../mocks/location.mock';
import { CatalogService } from '../../core/services/catalog.service';

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

  private readonly model = CLOTHING_MODELS.find((m) => m.id === this.data.item.modelId);

  readonly form = new FormGroup({
    name: new FormControl(this.model?.name ?? '', { nonNullable: true }),
    description: new FormControl(this.model?.description ?? ''),
    categoryId: new FormControl(this.model?.idCategory ?? '', { nonNullable: true }),
  });

  readonly newSizeInput = signal('');

  readonly newColorName = signal('');

  private readonly variantsVersion = signal(0);

  readonly modelColors = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _v = this.variantsVersion();
    const colorIds = [
      ...new Set(
        PRODUCTS.filter((p) => p.idClothingModel === this.data.item.modelId && p.active).map(
          (p) => p.idColor,
        ),
      ),
    ];
    return colorIds.map((cid) => ({
      id: cid,
      name: COLORS.find((c) => c.id === cid)?.name ?? cid,
    }));
  });

  readonly availableColors = computed(() =>
    COLORS.filter((c) => !this.modelColors().some((mc) => mc.id === c.id)),
  );

  readonly uniqueSizes = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _v = this.variantsVersion();
    const sizes = [
      ...new Set(
        PRODUCTS.filter(
          (p) => p.idClothingModel === this.data.item.modelId && p.active,
        ).map((p) => p.size),
      ),
    ];
    return sizes.sort((a, b) => parseInt(a) - parseInt(b));
  });

  getLocationStockEntry(locId: string) {
    const productIds = this.getModelProductIds();
    return STOCK_LOCATIONS.filter(
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
    const productIds = PRODUCTS.filter(
      (p) => p.idClothingModel === this.data.item.modelId && p.active && p.idColor === colorId,
    ).map((p) => p.id);
    return STOCK_LOCATIONS
      .filter((s) => s.idLocation === locationId && productIds.includes(s.idProduct))
      .reduce((sum, s) => sum + s.currentStock, 0);
  }

  getMinStockForLocation(locationId: string): number {
    return this.getLocationStockEntry(locationId).reduce(
      (sum, s) => sum + s.minimumStock,
      0,
    );
  }

  setMinStockForLocation(locationId: string, value: string): void {
    const newMin = parseInt(value) || 0;
    const perProduct = Math.max(1, Math.floor(newMin / this.uniqueSizes().length));
    const entries = this.getLocationStockEntry(locationId);
    for (const entry of entries) {
      entry.minimumStock = perProduct;
    }
  }

  setCurrentStockForLocation(locationId: string, value: string): void {
    const newTotal = parseInt(value) || 0;
    const entries = this.getLocationStockEntry(locationId);
    if (entries.length === 0) return;
    const perProduct = Math.floor(newTotal / entries.length);
    let remainder = newTotal % entries.length;
    for (const entry of entries) {
      entry.currentStock = perProduct + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
  }

  getStockForColorSizeInLocation(colorId: string, size: string, locationId: string): number {
    const productIds = PRODUCTS.filter(
      (p) =>
        p.idClothingModel === this.data.item.modelId &&
        p.active &&
        p.idColor === colorId &&
        p.size === size,
    ).map((p) => p.id);
    return STOCK_LOCATIONS
      .filter((s) => s.idLocation === locationId && productIds.includes(s.idProduct))
      .reduce((sum, s) => sum + s.currentStock, 0);
  }

  setCellCurrentStock(locationId: string, colorId: string, size: string, value: string): void {
    const newStock = Math.max(0, parseInt(value) || 0);
    const productIds = PRODUCTS.filter(
      (p) =>
        p.idClothingModel === this.data.item.modelId &&
        p.active &&
        p.idColor === colorId &&
        p.size === size,
    ).map((p) => p.id);
    const entries = STOCK_LOCATIONS.filter(
      (s) => productIds.includes(s.idProduct) && s.idLocation === locationId,
    );
    if (entries.length > 0) {
      for (const entry of entries) {
        entry.currentStock = newStock;
      }
    } else if (productIds.length > 0) {
      const nextId = String(
        Math.max(...STOCK_LOCATIONS.map((s) => parseInt(s.id)), 0) + 1,
      );
      STOCK_LOCATIONS.push({
        id: nextId,
        idProduct: productIds[0],
        idLocation: locationId,
        currentStock: newStock,
        minimumStock: 1,
      });
    }
  }

  addColor(): void {
    const name = this.newColorName().trim();
    if (!name) return;

    // Find existing color (case-insensitive) or create
    let colorId = COLORS.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    )?.id;
    if (!colorId) {
      colorId = this.nextId(COLORS);
      COLORS.push({ id: colorId, name });
    }

    // Prevent duplicate color on this model
    if (
      CLOTHING_MODEL_COLORS.some(
        (mc) => mc.idClothingModel === this.data.item.modelId && mc.idColor === colorId,
      )
    ) {
      this.newColorName.set('');
      return;
    }

    const modelId = this.data.item.modelId;
    const existingProduct = PRODUCTS.find((p) => p.idClothingModel === modelId && p.active);
    const costPrice = existingProduct?.costPrice ?? 0;
    const salePrice = existingProduct?.salePrice ?? 0;

    const nextModelColorId = this.nextId(CLOTHING_MODEL_COLORS);
    CLOTHING_MODEL_COLORS.push({
      id: nextModelColorId,
      idClothingModel: modelId,
      idColor: colorId,
      imageUrl: `https://placehold.co/400x400?text=${encodeURIComponent(name)}`,
    });

    for (const size of this.uniqueSizes()) {
      const nextProductId = this.nextId(PRODUCTS);
      PRODUCTS.push({
        id: nextProductId,
        idClothingModel: modelId,
        size,
        idColor: colorId,
        costPrice,
        salePrice,
        active: true,
      });
      for (const loc of this.data.locations) {
        STOCK_LOCATIONS.push({
          id: this.nextId(STOCK_LOCATIONS),
          idProduct: nextProductId,
          idLocation: loc.id,
          currentStock: 0,
          minimumStock: 1,
        });
      }
    }
    this.newColorName.set('');
    this.variantsVersion.set(this.variantsVersion() + 1);
  }

  removeColor(colorId: string): void {
    const modelId = this.data.item.modelId;
    const productIds = PRODUCTS.filter(
      (p) => p.idClothingModel === modelId && p.idColor === colorId && p.active,
    ).map((p) => p.id);

    for (const pid of productIds) {
      const idx = PRODUCTS.findIndex((p) => p.id === pid);
      if (idx !== -1) PRODUCTS.splice(idx, 1);
      for (let i = STOCK_LOCATIONS.length - 1; i >= 0; i--) {
        if (STOCK_LOCATIONS[i].idProduct === pid) STOCK_LOCATIONS.splice(i, 1);
      }
    }

    const mcIdx = CLOTHING_MODEL_COLORS.findIndex(
      (mc) => mc.idClothingModel === modelId && mc.idColor === colorId,
    );
    if (mcIdx !== -1) CLOTHING_MODEL_COLORS.splice(mcIdx, 1);
    this.variantsVersion.set(this.variantsVersion() + 1);
  }

  addSize(): void {
    const size = this.newSizeInput().trim();
    if (!size) return;
    const modelId = this.data.item.modelId;
    const existingProduct = PRODUCTS.find((p) => p.idClothingModel === modelId && p.active);
    const costPrice = existingProduct?.costPrice ?? 0;
    const salePrice = existingProduct?.salePrice ?? 0;

    for (const color of this.modelColors()) {
      const nextProductId = this.nextId(PRODUCTS);
      PRODUCTS.push({
        id: nextProductId,
        idClothingModel: modelId,
        size,
        idColor: color.id,
        costPrice,
        salePrice,
        active: true,
      });
      for (const loc of this.data.locations) {
        STOCK_LOCATIONS.push({
          id: this.nextId(STOCK_LOCATIONS),
          idProduct: nextProductId,
          idLocation: loc.id,
          currentStock: 0,
          minimumStock: 1,
        });
      }
    }
    this.newSizeInput.set('');
    this.variantsVersion.set(this.variantsVersion() + 1);
  }

  removeSize(size: string): void {
    const modelId = this.data.item.modelId;
    const productIds = PRODUCTS.filter(
      (p) => p.idClothingModel === modelId && p.size === size && p.active,
    ).map((p) => p.id);

    for (const pid of productIds) {
      const idx = PRODUCTS.findIndex((p) => p.id === pid);
      if (idx !== -1) PRODUCTS.splice(idx, 1);
      for (let i = STOCK_LOCATIONS.length - 1; i >= 0; i--) {
        if (STOCK_LOCATIONS[i].idProduct === pid) STOCK_LOCATIONS.splice(i, 1);
      }
    }
    this.variantsVersion.set(this.variantsVersion() + 1);
  }

  private nextId(arr: { id: string }[]): string {
    return String(Math.max(...arr.map((x) => parseInt(x.id)), 0) + 1);
  }

  private getModelProductIds(): string[] {
    return PRODUCTS.filter(
      (p) => p.idClothingModel === this.data.item.modelId && p.active,
    ).map((p) => p.id);
  }

  selectTab(tab: TabName): void {
    this.activeTab.set(tab);
  }

  save(): void {
    if (this.model) {
      this.model.name = this.form.controls.name.value;
      this.model.description = this.form.controls.description.value || undefined;
      this.model.idCategory = this.form.controls.categoryId.value;
    }
    this.catalogService.triggerRefresh();
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
