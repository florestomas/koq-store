import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import {
  TransferService,
  SelectableModel,
} from '../../core/services/transfer.service';
import {
  VariantPickerModalComponent,
  VariantPickerData,
  VariantPickerResult,
} from '../../shared/variant-picker-modal/variant-picker-modal.component';

@Component({
  selector: 'app-transferencia',
  imports: [UpperCasePipe, ReactiveFormsModule, MatIcon],
  templateUrl: './transferencia.component.html',
  styleUrl: './transferencia.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaComponent {
  readonly transferService = inject(TransferService);
  private readonly dialog = inject(MatDialog);

  readonly searchControl = new FormControl('');
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);
  readonly isConfirming = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const sub = this.searchControl.valueChanges.subscribe((v) =>
      this.transferService.searchTerm.set(v ?? ''),
    );
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  openVariantPicker(model: SelectableModel): void {
    const data: VariantPickerData = {
      model,
      originId: this.transferService.originId(),
      existingItems: this.transferService.items(),
    };

    const dialogRef = this.dialog.open<
      VariantPickerModalComponent,
      VariantPickerData,
      VariantPickerResult
    >(VariantPickerModalComponent, { data, maxWidth: '90vw' });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.transferService.addItemsFromPicker(model, result.quantities);
      }
    });
  }

  async confirmTransfer(): Promise<void> {
    if (this.isConfirming()) return;

    if (!window.confirm('¿Confirmar esta transferencia?')) return;

    this.error.set(null);
    this.isConfirming.set(true);
    try {
      const ok = await this.transferService.confirmTransfer();
      if (ok) {
        this.confirmed.set(true);
        setTimeout(() => this.confirmed.set(false), 3000);
      } else {
        this.error.set('Error al confirmar la transferencia. Verificá destino y stock.');
      }
    } finally {
      this.isConfirming.set(false);
    }
  }

  getLocationName(locId: string): string {
    return (
      this.transferService.getLocations().find((l) => l.id === locId)?.name ?? locId
    );
  }
}
