import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ReceptionService } from '../../core/services/reception.service';

@Component({
  selector: 'app-recepciones',
  imports: [DatePipe, UpperCasePipe, MatIcon],
  templateUrl: './recepciones.component.html',
  styleUrl: './recepciones.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecepcionesComponent {
  readonly receptionService = inject(ReceptionService);

  readonly expandedTransferId = signal<string | null>(null);
  readonly receivedQty = signal<Record<string, number>>({});
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);

  toggleExpand(transferId: string): void {
    this.expandedTransferId.update((id) =>
      id === transferId ? null : transferId,
    );
  }

  setReceivedQty(transferId: string, productId: string, rawValue: string): void {
    const maxQty = this.receptionService
      .pendingTransfers()
      .find((t) => t.id === transferId)
      ?.details.find((d) => d.productId === productId)?.quantitySent ?? 0;

    const value = Math.min(Math.max(parseInt(rawValue) || 0, 0), maxQty);

    this.receivedQty.update((map) => ({
      ...map,
      [`${transferId}:${productId}`]: value,
    }));
  }

  getReceivedQty(transferId: string, productId: string, defaultQty: number): number {
    return (
      this.receivedQty()[`${transferId}:${productId}`] ?? defaultQty
    );
  }

  confirmReception(transferId: string): void {
    if (
      !window.confirm(
        '¿Estás seguro de que querés confirmar esta recepción?',
      )
    )
      return;

    const transfer = this.receptionService
      .pendingTransfers()
      .find((t) => t.id === transferId);
    if (!transfer) return;

    const receivedMap: Record<string, number> = {};
    for (const detail of transfer.details) {
      receivedMap[detail.productId] = this.getReceivedQty(
        transferId,
        detail.productId,
        detail.quantitySent,
      );
    }

    const ok = this.receptionService.confirmReception(transferId, receivedMap);

    if (ok) {
      this.confirmed.set(true);
      this.error.set(null);
      this.expandedTransferId.set(null);
      setTimeout(() => this.confirmed.set(false), 3000);
    } else {
      this.error.set('Error al confirmar la recepción. Intente nuevamente.');
    }
  }
}
