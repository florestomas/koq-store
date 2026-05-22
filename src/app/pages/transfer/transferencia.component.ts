import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import {
  TransferService,
  SelectableModel,
} from '../../core/services/transfer.service';
import { CatalogService } from '../../core/services/catalog.service';

@Component({
  selector: 'app-transferencia',
  imports: [UpperCasePipe, ReactiveFormsModule, MatIcon],
  templateUrl: './transferencia.component.html',
  styleUrl: './transferencia.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaComponent {
  readonly transferService = inject(TransferService);
  private readonly catalogService = inject(CatalogService);

  readonly searchControl = new FormControl('');
  readonly confirmed = signal(false);

  readonly selectedModel = signal<SelectableModel | null>(null);
  readonly selectedColorId = signal<string | null>(null);
  readonly selectedSize = signal<string | null>(null);

  constructor() {
    this.searchControl.valueChanges.subscribe((v) =>
      this.transferService.searchTerm.set(v ?? ''),
    );
  }

  selectModel(model: SelectableModel): void {
    if (this.selectedModel()?.modelId === model.modelId) {
      // Already selected — toggle off
      this.selectedModel.set(null);
      this.selectedColorId.set(null);
      this.selectedSize.set(null);
      return;
    }
    this.selectedModel.set(model);
    this.selectedColorId.set(model.colors[0]?.id ?? null);
    this.selectedSize.set(model.sizes[0] ?? null);
  }

  addToTransfer(): void {
    const model = this.selectedModel();
    const colorId = this.selectedColorId();
    const size = this.selectedSize();
    if (model && colorId && size) {
      this.transferService.addItem(model, colorId, size);
    }
  }

  getSelectedVariantStock(): number {
    const model = this.selectedModel();
    const colorId = this.selectedColorId();
    const size = this.selectedSize();
    if (!model || !colorId || !size) return 0;
    const productId = this.transferService.getProductId(model.modelId, colorId, size);
    if (!productId) return 0;
    return this.transferService.getStockForColorSize(productId, this.transferService.originId());
  }

  confirmTransfer(): void {
    const ok = this.transferService.confirmTransfer();
    if (ok) {
      this.confirmed.set(true);
      this.selectedModel.set(null);
      this.selectedColorId.set(null);
      this.selectedSize.set(null);
      setTimeout(() => this.confirmed.set(false), 3000);
    }
  }

  getLocationName(locId: string): string {
    return (
      this.transferService.getLocations().find((l) => l.id === locId)?.name ?? locId
    );
  }
}
