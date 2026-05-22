import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { StockBadgeComponent } from '../stock-badge.component/stock-badge.component';
import { CatalogItem, ColorSizeRow } from '../../../../interfaces/catalog-item';
import { COLORS } from '../../../../mocks/colors.mock';

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
  readonly selectedLocationId = signal<string | null>('1');

  readonly currentGrid = computed<ColorSizeRow[]>(() => {
    const locId = this.selectedLocationId();
    if (!locId) {
      return this.item().colorSizeGrid;
    }

    const prods = this.item().products;
    const stocks = this.item().allStocks.filter((s) => s.idLocation === locId);

    const colorIds = [...new Set(prods.map((p) => p.idColor))];
    return colorIds.map((cid) => {
      const colorName = COLORS.find((c) => c.id === cid)?.name ?? cid;
      const colorProducts = prods.filter((p) => p.idColor === cid);
      const sizes = [...new Set(colorProducts.map((p) => p.size))]
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((size) => {
          const sizeProducts = colorProducts.filter((p) => p.size === size);
          const sizeStock = stocks
            .filter((s) => sizeProducts.some((sp) => sp.id === s.idProduct))
            .reduce((sum, s) => sum + s.currentStock, 0);
          return { size, stock: sizeStock };
        });
      return { colorName, sizes };
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

  readonly mainAlert = computed(() => this.item().stockAlerts[0] ?? null);

  getStockForSize(row: ColorSizeRow, size: string): number {
    return row.sizes.find((s) => s.size === size)?.stock ?? 0;
  }
}
