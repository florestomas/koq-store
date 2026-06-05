import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { ReceptionService, DetailRow } from '../../core/services/reception.service';

interface ReceptionCache {
  selectedTransferId: string | null;
  receivedQty: Record<string, number>;
  note: string;
}

@Component({
  selector: 'app-recepciones',
  imports: [DatePipe, UpperCasePipe, MatIcon],
  templateUrl: './recepciones.component.html',
  styleUrl: './recepciones.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecepcionesComponent {
  private static readonly CACHE_KEY = 'koq-reception-cache';

  readonly receptionService = inject(ReceptionService);
  readonly authService = inject(AuthService);

  readonly selectedTransferId = signal<string | null>(null);
  readonly receivedQty = signal<Record<string, number>>({});
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);
  readonly note = signal('');

  private saveToCache(): void {
    try {
      sessionStorage.setItem(
        RecepcionesComponent.CACHE_KEY,
        JSON.stringify({
          selectedTransferId: this.selectedTransferId(),
          receivedQty: this.receivedQty(),
          note: this.note(),
        } satisfies ReceptionCache),
      );
    } catch {}
  }

  private restoreFromCache(): void {
    try {
      const raw = sessionStorage.getItem(RecepcionesComponent.CACHE_KEY);
      if (!raw) return;
      const cached: ReceptionCache = JSON.parse(raw);
      if (cached.selectedTransferId) {
        this.selectedTransferId.set(cached.selectedTransferId);
        this.receivedQty.set(cached.receivedQty ?? {});
        this.note.set(cached.note ?? '');
      }
    } catch {}
  }

  private clearCache(): void {
    try {
      sessionStorage.removeItem(RecepcionesComponent.CACHE_KEY);
    } catch {}
  }

  constructor() {
    this.restoreFromCache();
  }

  readonly selectedTransfer = computed(() => {
    const id = this.selectedTransferId();
    if (!id) return null;
    return (
      this.receptionService.pendingTransfers().find((t) => t.id === id) ??
      null
    );
  });

  readonly hoursUntilOld = 24;

  selectTransfer(id: string): void {
    this.selectedTransferId.set(id);
    this.error.set(null);
    this.confirmed.set(false);
    this.note.set('');
    this.saveToCache();
  }

  isTransferOld(dateTime: string): boolean {
    const now = Date.now();
    const transferTime = new Date(dateTime).getTime();
    return now - transferTime > this.hoursUntilOld * 60 * 60 * 1000;
  }

  formatTransferCode(id: string): string {
    return `TRF-${id.padStart(4, '0')}`;
  }

  setReceivedQty(productId: string, rawValue: string): void {
    const transfer = this.selectedTransfer();
    if (!transfer) return;

    const detail = transfer.details.find(
      (d) => d.productId === productId,
    );
    if (!detail) return;

    const value = Math.max(parseInt(rawValue) || 0, 0);

    this.receivedQty.update((map) => ({
      ...map,
      [`${transfer.id}:${productId}`]: value,
    }));
    this.saveToCache();
  }

  getReceivedQty(productId: string, defaultQty: number): number {
    const transferId = this.selectedTransferId();
    if (!transferId) return defaultQty;
    return (
      this.receivedQty()[`${transferId}:${productId}`] ?? defaultQty
    );
  }

  hasDiscrepancy(detail: DetailRow): boolean {
    return this.getReceivedQty(detail.productId, detail.quantitySent) !== detail.quantitySent;
  }

  setNote(value: string): void {
    this.note.set(value);
    this.saveToCache();
  }

  async confirmCurrentReception(): Promise<void> {
    const transfer = this.selectedTransfer();
    if (!transfer) return;

    if (
      !window.confirm(
        '¿Estás seguro de que querés confirmar esta recepción?',
      )
    )
      return;

    const receivedMap: Record<string, number> = {};
    for (const detail of transfer.details) {
      receivedMap[detail.productId] = this.getReceivedQty(
        detail.productId,
        detail.quantitySent,
      );
    }

    const ok = await this.receptionService.confirmReception(
      transfer.id,
      receivedMap,
      this.note(),
    );

    if (ok) {
      this.clearCache();
      this.confirmed.set(true);
      this.error.set(null);
      this.selectedTransferId.set(null);
      this.receivedQty.set({});
      this.note.set('');
      setTimeout(() => this.confirmed.set(false), 3000);
    } else {
      this.error.set('Error al confirmar la recepción. Intente nuevamente.');
    }
  }

  async deleteTransfer(transferId: string): Promise<void> {
    if (!window.confirm('¿Eliminar esta recepción definitivamente?')) return;
    await this.receptionService.hardDeleteTransfer(transferId);
    if (this.selectedTransferId() === transferId) {
      this.selectedTransferId.set(null);
    }
  }
}
