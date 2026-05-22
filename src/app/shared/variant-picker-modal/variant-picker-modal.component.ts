import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { UpperCasePipe } from '@angular/common';
import { SelectableModel } from '../../core/services/transfer.service';
import { COLORS } from '../../mocks/colors.mock';
import { PRODUCTS } from '../../mocks/products.mock';
import { STOCK_LOCATIONS } from '../../mocks/stock-location.mock';

export interface VariantPickerData {
  model: SelectableModel;
  originId: string;
}

export interface VariantPickerResult {
  quantities: Record<string, Record<string, number>>;
}

@Component({
  selector: 'app-variant-picker-modal',
  imports: [MatDialogModule, MatButtonModule, UpperCasePipe],
  templateUrl: './variant-picker-modal.component.html',
  styleUrl: './variant-picker-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantPickerModalComponent {
  readonly data: VariantPickerData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<VariantPickerModalComponent, VariantPickerResult>>(MatDialogRef);

  readonly quantities = signal<Record<string, Record<string, number>>>({});

  getColorName(colorId: string): string {
    return COLORS.find((c) => c.id === colorId)?.name ?? colorId;
  }

  getStock(colorId: string, size: string): number {
    const product = PRODUCTS.find(
      (p) => p.idClothingModel === this.data.model.modelId && p.idColor === colorId && p.size === size && p.active,
    );
    if (!product) return 0;
    return STOCK_LOCATIONS.filter(
      (s) => s.idProduct === product.id && s.idLocation === this.data.originId,
    ).reduce((sum, s) => sum + s.currentStock, 0);
  }

  getQty(colorId: string, size: string): number {
    return this.quantities()[colorId]?.[size] ?? 0;
  }

  setQty(colorId: string, size: string, value: string): void {
    const stock = this.getStock(colorId, size);
    if (stock <= 0) return;
    const qty = Math.max(0, Math.min(parseInt(value) || 0, stock));
    this.quantities.update((q) => {
      const next = { ...q };
      if (!next[colorId]) next[colorId] = {};
      next[colorId] = { ...next[colorId], [size]: qty };
      return next;
    });
  }

  totalSelected(): number {
    let total = 0;
    const q = this.quantities();
    for (const colorId of Object.keys(q)) {
      for (const size of Object.keys(q[colorId])) {
        total += q[colorId][size];
      }
    }
    return total;
  }

  confirm(): void {
    this.dialogRef.close({ quantities: this.quantities() });
  }

  close(): void {
    this.dialogRef.close();
  }
}
