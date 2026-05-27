import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SalesHistoryService } from '../../core/services/sales-history.service';
import { TransferHistoryService, TransferRow } from '../../core/services/transfer-history.service';
import { StockMovementService } from '../../core/services/stock-movement.service';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, UpperCasePipe, DecimalPipe, MatIcon, FormsModule],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialComponent {
  readonly authService = inject(AuthService);
  readonly salesHistoryService = inject(SalesHistoryService);
  readonly transferHistoryService = inject(TransferHistoryService);
  readonly stockMovementService = inject(StockMovementService);

  readonly activeTab = signal<'ventas' | 'transferencias' | 'movimientos'>('ventas');

  readonly expandedSaleId = signal<string | null>(null);
  readonly expandedTransferId = signal<string | null>(null);

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

  readonly statusFilters: ('all' | 'pending' | 'confirmed' | 'cancelled')[] = [
    'all',
    'pending',
    'confirmed',
    'cancelled',
  ];

  readonly typeFilters: ('all' | 'in' | 'out')[] = ['all', 'in', 'out'];

  readonly isAdmin = computed(
    () => this.authService.currentUser()?.role === 'admin',
  );
  readonly userLocationId = computed(
    () => this.authService.currentUser()?.idLocation ?? '1',
  );

  constructor() {
    this.salesHistoryService.dateFrom.set(this.thirtyDaysAgo);
    this.salesHistoryService.dateTo.set(this.today);
    this.transferHistoryService.dateFrom.set(this.thirtyDaysAgo);
    this.transferHistoryService.dateTo.set(this.today);
    this.stockMovementService.dateFrom.set(this.thirtyDaysAgo);
    this.stockMovementService.dateTo.set(this.today);
  }

  toggleExpand(saleId: string): void {
    this.expandedSaleId.update((id) => (id === saleId ? null : saleId));
  }

  toggleTransferExpand(id: string): void {
    this.expandedTransferId.update((tid) => (tid === id ? null : id));
  }

  setSaleDateFrom(value: string): void {
    this.salesHistoryService.dateFrom.set(value || null);
  }

  setSaleDateTo(value: string): void {
    this.salesHistoryService.dateTo.set(value || null);
  }

  setTransferDateFrom(value: string): void {
    this.transferHistoryService.dateFrom.set(value || null);
  }

  setTransferDateTo(value: string): void {
    this.transferHistoryService.dateTo.set(value || null);
  }

  setMovementDateFrom(value: string): void {
    this.stockMovementService.dateFrom.set(value || null);
  }

  setMovementDateTo(value: string): void {
    this.stockMovementService.dateTo.set(value || null);
  }

  setChannel(ch: 'all' | 'local' | 'whatsapp'): void {
    this.salesHistoryService.channel.set(ch);
  }

  setSaleLocation(value: string): void {
    this.salesHistoryService.locationId.set(value || null);
  }

  setTransferStatus(st: 'all' | 'pending' | 'confirmed' | 'cancelled'): void {
    this.transferHistoryService.statusFilter.set(st);
  }

  setTransferLocation(value: string): void {
    this.transferHistoryService.locationId.set(value || null);
  }

  setMovementType(t: 'all' | 'in' | 'out'): void {
    this.stockMovementService.typeFilter.set(t);
  }

  setMovementLocation(value: string): void {
    this.stockMovementService.locationId.set(value || null);
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

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'PENDIENTE';
      case 'confirmed': return 'CONFIRMADA';
      case 'cancelled': return 'CANCELADA';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-600 line-through';
      default: return '';
    }
  }

  async confirmCancel(saleId: string): Promise<void> {
    if (window.confirm('¿Estás seguro de que querés anular esta venta?')) {
      const ok = await this.salesHistoryService.cancelSale(saleId);
      if (!ok) {
        console.error('No se pudo anular la venta');
      }
    }
  }
}
