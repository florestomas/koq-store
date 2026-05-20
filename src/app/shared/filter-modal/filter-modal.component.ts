import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { StockFilter } from '../../core/services/catalog.service';
import { Location } from '../../interfaces/location';

export interface FilterModalData {
  locations: Location[];
  isAdmin: boolean;
  currentLocationId: string | null;
  currentStockFilter: StockFilter;
}

export interface FilterModalResult {
  locationId: string | null;
  stockFilter: StockFilter;
}

const STOCK_LABELS: Record<StockFilter, string> = {
  all: 'Todos',
  low: 'Stock bajo',
  out: 'Sin stock',
};

@Component({
  selector: 'app-filter-modal',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './filter-modal.component.html',
  styleUrl: './filter-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterModalComponent {
  readonly data: FilterModalData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<FilterModalComponent, FilterModalResult>>(MatDialogRef);

  readonly selectedLocationId = signal<string | null>(this.data.currentLocationId);
  readonly selectedStockFilter = signal<StockFilter>(this.data.currentStockFilter);

  toggleLocation(locationId: string | null): void {
    this.selectedLocationId.set(
      this.selectedLocationId() === locationId ? null : locationId,
    );
  }

  setStockFilter(value: StockFilter): void {
    this.selectedStockFilter.set(value);
  }

  stockLabel(value: StockFilter): string {
    return STOCK_LABELS[value];
  }

  apply(): void {
    this.dialogRef.close({
      locationId: this.selectedLocationId(),
      stockFilter: this.selectedStockFilter(),
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
