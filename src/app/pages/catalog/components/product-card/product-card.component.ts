import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { StockBadgeComponent } from '../stock-badge.component/stock-badge.component';
import { CatalogItem, ColorSizeRow } from '../../../../interfaces/catalog-item';
import { CatalogService } from '../../../../core/services/catalog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { getColorHex } from '../../../../core/utils/colors';
import {
  ProductEditModalComponent,
  ProductEditModalData,
} from '../../../../shared/product-edit-modal/product-edit-modal.component';

@Component({
  selector: 'app-product-card',
  imports: [MatIcon, StockBadgeComponent, UpperCasePipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly item = input.required<CatalogItem>();
  readonly cardExpanded = signal(false);
  protected readonly authService = inject(AuthService);
  readonly selectedLocationId = signal<string | null>(
    this.authService.isAdmin() ? '1' : (this.authService.currentUser()?.idLocation ?? null),
  );
  private readonly dialog = inject(MatDialog);
  private readonly catalogService = inject(CatalogService);

  async deleteModel(): Promise<void> {
    if (!window.confirm('¿Eliminar este producto definitivamente? Esta acción no se puede deshacer.')) return;
    await this.catalogService.hardDeleteModel(this.item().modelId);
  }

  openEdit(): void {
    const data: ProductEditModalData = {
      item: this.item(),
      categories: this.catalogService.categories(),
      locations: this.catalogService.locations(),
      isAdmin: this.authService.isAdmin(),
    };
    this.dialog.open(ProductEditModalComponent, { data, maxWidth: '90vw' });
  }

  readonly getColorHex = getColorHex;
  readonly colors = this.catalogService.colors;

  readonly currentGrid = computed<ColorSizeRow[]>(() => {
    const locId = this.selectedLocationId();
    if (!locId) {
      return this.item().colorSizeGrid;
    }

    const prods = this.item().products;
    const stocks = this.item().allStocks.filter((s) => s.idLocation === locId);

    const colorIds = [...new Set(prods.map((p) => p.idColor))];
    return colorIds
      .map((cid) => {
        const colorName = this.colors().find((c) => c.id === cid)?.name ?? cid;
        const colorProducts = prods.filter((p) => p.idColor === cid);
        const sizes = [...new Set(colorProducts.map((p) => p.size))]
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((size) => {
            const sizeProducts = colorProducts.filter((p) => p.size === size);
            const sizeStock = stocks
              .filter((s) => sizeProducts.some((sp) => sp.id === s.idProduct))
              .reduce((sum, s) => sum + s.currentStock, 0);
            const sizeMinStock = stocks
              .filter((s) => sizeProducts.some((sp) => sp.id === s.idProduct))
              .reduce((sum, s) => sum + s.minimumStock, 0);
            return { size, stock: sizeStock, minStock: sizeMinStock };
          });
        return { colorName, sizes };
      })
      .sort((a, b) => {
        const stockA = a.sizes.reduce((sum, s) => sum + s.stock, 0);
        const stockB = b.sizes.reduce((sum, s) => sum + s.stock, 0);
        return stockB - stockA;
      });
  });

  readonly uniqueSizes = computed<string[]>(() => {
    const sizes = new Set<string>();
    for (const row of this.currentGrid()) {
      for (const s of row.sizes) {
        sizes.add(s.size);
      }
    }
    return [...sizes].sort((a, b) => parseInt(a) - parseInt(b));
  });

  readonly alertLabels = computed(() =>
    this.item().stockAlerts.map((a) => ({
      label: a.type === 'out' ? `Agotado en ${a.locationName}` : `Bajo en ${a.locationName}`,
      type: a.type,
      locationName: a.locationName,
    })),
  );

  getStockForSize(row: ColorSizeRow, size: string): number {
    return row.sizes.find((s) => s.size === size)?.stock ?? 0;
  }

  getMinStockForSize(row: ColorSizeRow, size: string): number {
    return row.sizes.find((s) => s.size === size)?.minStock ?? 0;
  }
}
