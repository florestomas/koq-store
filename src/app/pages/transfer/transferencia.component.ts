import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

  constructor() {
    this.searchControl.valueChanges.subscribe((v) =>
      this.transferService.searchTerm.set(v ?? ''),
    );
  }

  openVariantPicker(model: SelectableModel): void {
    const data: VariantPickerData = {
      model,
      originId: this.transferService.originId(),
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

  confirmTransfer(): void {
    const ok = this.transferService.confirmTransfer();
    if (ok) {
      this.confirmed.set(true);
      setTimeout(() => this.confirmed.set(false), 3000);
    }
  }

  getLocationName(locId: string): string {
    return (
      this.transferService.getLocations().find((l) => l.id === locId)?.name ?? locId
    );
  }
}
