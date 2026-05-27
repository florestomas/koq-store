import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SalesHistoryService } from '../../core/services/sales-history.service';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, UpperCasePipe, DecimalPipe, MatIcon],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialComponent {
  readonly authService = inject(AuthService);
  readonly salesHistoryService = inject(SalesHistoryService);

  readonly expandedSaleId = signal<string | null>(null);

  readonly today = new Date().toISOString().split('T')[0];
  readonly thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];

  readonly channels: ('all' | 'local' | 'whatsapp')[] = [
    'all',
    'local',
    'whatsapp',
  ];

  readonly isAdmin = computed(
    () => this.authService.currentUser()?.role === 'admin',
  );
  readonly userLocationId = computed(
    () => this.authService.currentUser()?.idLocation ?? '1',
  );

  constructor() {
    this.salesHistoryService.dateFrom.set(this.thirtyDaysAgo);
    this.salesHistoryService.dateTo.set(this.today);
  }

  toggleExpand(saleId: string): void {
    this.expandedSaleId.update((id) => (id === saleId ? null : saleId));
  }

  setDateFrom(value: string): void {
    this.salesHistoryService.dateFrom.set(value || null);
  }

  setDateTo(value: string): void {
    this.salesHistoryService.dateTo.set(value || null);
  }

  setChannel(ch: 'all' | 'local' | 'whatsapp'): void {
    this.salesHistoryService.channel.set(ch);
  }

  setLocation(value: string): void {
    this.salesHistoryService.locationId.set(value || null);
  }

  getChannelIcon(channel: string): string {
    switch (channel) {
      case 'local':
        return 'store';
      case 'whatsapp':
        return 'chat';

      default:
        return 'sell';
    }
  }

  confirmCancel(saleId: string): void {
    if (window.confirm('¿Estás seguro de que querés anular esta venta?')) {
      const ok = this.salesHistoryService.cancelSale(saleId);
      if (!ok) {
        console.error('No se pudo anular la venta');
      }
    }
  }
}
