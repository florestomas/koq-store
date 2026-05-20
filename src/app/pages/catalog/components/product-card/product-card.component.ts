import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { StockBadgeComponent } from '../stock-badge.component/stock-badge.component';
import { CatalogItem, ColorSizeRow } from '../../../../interfaces/catalog-item';

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

  readonly uniqueSizes = computed<string[]>(() => {
    const sizes = new Set<string>();
    for (const row of this.item().colorSizeGrid) {
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
