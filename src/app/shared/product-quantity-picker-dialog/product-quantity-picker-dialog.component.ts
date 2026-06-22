import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { getColorHex, colorPriority } from '../../core/utils/colors';

export interface QuantityPickerRow {
  colorName: string;
  cells: QuantityPickerCell[];
}

export interface QuantityPickerCell {
  productId: string | null;
  size: string;
  stock?: number;
}

export interface QuantityPickerData {
  modelName: string;
  imageUrl: string;
  sizes: string[];
  rows: QuantityPickerRow[];
  showStock?: boolean;
}

export interface QuantityPickerResult {
  quantities: Record<string, number>;
}

@Component({
  selector: 'app-product-quantity-picker-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './product-quantity-picker-dialog.component.html',
  styleUrl: './product-quantity-picker-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductQuantityPickerDialogComponent {
  readonly data: QuantityPickerData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<ProductQuantityPickerDialogComponent, QuantityPickerResult>>(
    MatDialogRef,
  );

  readonly getColorHex = getColorHex;
  readonly quantities = signal<Record<string, number>>({});

  readonly sortedRows = signal<QuantityPickerRow[]>([]);

  constructor() {
    const rows = [...this.data.rows].sort((a, b) => {
      const pa = colorPriority(a.colorName);
      const pb = colorPriority(b.colorName);
      if (pa !== pb) return pa - pb;
      return a.colorName.localeCompare(b.colorName);
    });
    this.sortedRows.set(rows);
  }

  getQty(productId: string): number {
    return this.quantities()[productId] ?? 0;
  }

  setQty(productId: string, rawValue: string, max?: number): void {
    let value = Math.max(0, parseInt(rawValue) || 0);
    if (max !== undefined && value > max) value = max;
    this.quantities.update((q) => ({ ...q, [productId]: value }));
  }

  totalSelected(): number {
    const q = this.quantities();
    return Object.values(q).reduce((sum, n) => sum + n, 0);
  }

  confirm(): void {
    this.dialogRef.close({ quantities: this.quantities() });
  }

  close(): void {
    this.dialogRef.close();
  }
}
