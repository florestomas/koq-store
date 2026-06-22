import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SalesHistoryService, SaleRow } from '../../core/services/sales-history.service';
import { TransferHistoryService, TransferRow } from '../../core/services/transfer-history.service';
import { StockMovementService, IngresoGroup } from '../../core/services/stock-movement.service';

type TimelineType = 'venta' | 'transferencia' | 'ingreso';

interface TimelineEvent {
  id: string;
  dateTime: string;
  type: TimelineType;
  icon: string;
  summary: string;
  meta: string;
  metaClass: string;
  amount: string;
  amountClass: string;
  rowClass: string;
  sale?: SaleRow;
  transfer?: TransferRow;
  ingreso?: IngresoGroup;
}

const PAGE_SIZE = 25;

@Component({
  selector: 'app-historial',
  imports: [DatePipe, DecimalPipe, MatIcon, ReactiveFormsModule],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialComponent {
  readonly authService = inject(AuthService);
  readonly salesHistoryService = inject(SalesHistoryService);
  readonly transferHistoryService = inject(TransferHistoryService);
  readonly stockMovementService = inject(StockMovementService);
  private readonly router = inject(Router);

  readonly today = this.formatLocalDate(new Date());
  readonly startOfWeek = this.formatLocalDate(this.getMonday());

  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly locationId = signal<string | null>(null);
  readonly timelineTypes = signal<Set<TimelineType>>(
    new Set(['venta', 'transferencia', 'ingreso']),
  );

  readonly activeTimelineType = computed<TimelineType | null>(() => {
    const types = this.timelineTypes();
    if (types.size === 1) {
      return [...types][0];
    }
    return null;
  });

  readonly page = signal(0);
  readonly pageSize = PAGE_SIZE;

  readonly expandedId = signal<string | null>(null);
  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');

  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.dateFrom.set(this.startOfWeek);
    this.dateTo.set(this.today);
    this.applyFilters();

    const sub = this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set((value ?? '').toLowerCase().trim());
        this.page.set(0);
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private formatLocalDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getMonday(): Date {
    const now = new Date();
    const day = now.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    now.setDate(now.getDate() + offset);
    now.setHours(0, 0, 0, 0);
    return now;
  }

  private applyFilters(): void {
    const from = this.dateFrom();
    const to = this.dateTo();
    const loc = this.locationId();

    this.salesHistoryService.dateFrom.set(from);
    this.salesHistoryService.dateTo.set(to);
    this.salesHistoryService.locationId.set(loc);
    this.salesHistoryService.channel.set('all');

    this.transferHistoryService.dateFrom.set(from);
    this.transferHistoryService.dateTo.set(to);
    this.transferHistoryService.locationId.set(loc);
    this.transferHistoryService.statusFilter.set('all');

    this.stockMovementService.dateFrom.set(from);
    this.stockMovementService.dateTo.set(to);
    this.stockMovementService.locationId.set(loc);
    this.stockMovementService.typeFilter.set('all');
  }

  setDateFrom(value: string): void {
    this.dateFrom.set(value || null);
    this.applyFilters();
    this.page.set(0);
  }

  setDateTo(value: string): void {
    this.dateTo.set(value || null);
    this.applyFilters();
    this.page.set(0);
  }

  setLocation(value: string): void {
    this.locationId.set(value || null);
    this.applyFilters();
    this.page.set(0);
  }

  setActiveType(type: TimelineType): void {
    if (this.activeTimelineType() === type) {
      this.showAllTypes();
    } else {
      this.timelineTypes.set(new Set([type]));
    }
    this.page.set(0);
  }

  showAllTypes(): void {
    this.timelineTypes.set(new Set(['venta', 'transferencia', 'ingreso']));
    this.page.set(0);
  }

  toggleType(type: TimelineType): void {
    this.timelineTypes.update((types) => {
      const next = new Set(types);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
    this.page.set(0);
  }

  hasType(type: TimelineType): boolean {
    return this.timelineTypes().has(type);
  }

  readonly summary = computed(() => {
    const sales = this.salesHistoryService.filteredSales();
    const transfers = this.transferHistoryService.filteredTransfers();
    const ingresos = this.stockMovementService.groupedIngresos();

    return {
      ventasCount: sales.filter((s) => s.status === 'active').length,
      ventasRevenue: sales
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => sum + s.totalAmount, 0),
      transferenciasCount: transfers.filter((t) => t.status !== 'cancelled').length,
      transferenciasValue: transfers
        .filter((t) => t.status !== 'cancelled')
        .reduce((sum, t) => sum + t.totalValue, 0),
      transferenciasItems: transfers
        .filter((t) => t.status !== 'cancelled')
        .reduce((sum, t) => sum + t.itemCount, 0),
      transferenciasPrendas: transfers
        .filter((t) => t.status !== 'cancelled')
        .reduce((sum, t) => sum + t.details.reduce((s, d) => s + d.quantity, 0), 0),
      ingresosCount: ingresos.length,
      ingresosUnits: ingresos.reduce((sum, g) => sum + g.totalUnits, 0),
      ingresosItems: ingresos.reduce((sum, g) => sum + g.itemCount, 0),
    };
  });

  readonly timelineEvents = computed<TimelineEvent[]>(() => {
    const types = this.timelineTypes();
    const events: TimelineEvent[] = [];

    if (types.has('venta')) {
      for (const sale of this.salesHistoryService.filteredSales()) {
        const cancelled = sale.status === 'cancelled';
        events.push({
          id: sale.id,
          dateTime: sale.dateTime,
          type: 'venta',
          icon: 'receipt_long',
          summary: `Venta · ${sale.operatorName}`,
          meta: cancelled ? 'DEVUELTA' : (sale.channel === 'whatsapp' ? 'WhatsApp' : 'Local'),
          metaClass: cancelled ? 'text-red-400' : (sale.channel === 'whatsapp' ? 'text-blue-500' : 'text-green-600'),
          amount: `$ ${Math.round(sale.totalAmount).toLocaleString()}`,
          amountClass: cancelled ? 'text-red-400 line-through' : 'text-zinc-800',
          rowClass: cancelled ? 'opacity-60' : '',
          sale,
        });
      }
    }

    if (types.has('transferencia')) {
      for (const trf of this.transferHistoryService.filteredTransfers()) {
        let statusMeta: string;
        let statusClass: string;
        switch (trf.status) {
          case 'confirmed':
            statusMeta = 'CONFIRMADA';
            statusClass = 'text-green-600';
            break;
          case 'cancelled':
            statusMeta = 'CANCELADA';
            statusClass = 'text-red-400';
            break;
          default:
            statusMeta = 'PENDIENTE';
            statusClass = 'text-amber-600';
        }
        events.push({
          id: trf.id,
          dateTime: trf.dateTime,
          type: 'transferencia',
          icon: 'swap_horiz',
          summary: `Traslado stock · ${trf.originName} → ${trf.destinationName}`,
          meta: statusMeta,
          metaClass: statusClass,
          amount: `$ ${Math.round(trf.totalValue).toLocaleString()}`,
          amountClass: trf.status === 'cancelled' ? 'text-red-400 line-through' : 'text-zinc-800',
          rowClass: trf.status === 'cancelled' ? 'opacity-60' : '',
          transfer: trf,
        });
      }
    }

    if (types.has('ingreso')) {
      for (const ing of this.stockMovementService.groupedIngresos()) {
        events.push({
          id: ing.id,
          dateTime: ing.dateTime,
          type: 'ingreso',
          icon: 'add_shopping_cart',
          summary: `Ingreso · ${ing.itemCount} ítem${ing.itemCount !== 1 ? 's' : ''}`,
          meta: ing.locationName,
          metaClass: 'text-zinc-500',
          amount: `+${ing.totalUnits}`,
          amountClass: 'text-green-600',
          rowClass: '',
          ingreso: ing,
        });
      }
    }

    events.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    const term = this.searchTerm();
    if (term) {
      const normalized = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return events.filter((e) => e.summary.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalized));
    }
    return events;
  });

  readonly paginatedEvents = computed(() => {
    const start = this.page() * this.pageSize;
    return this.timelineEvents().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.timelineEvents().length / this.pageSize)),
  );

  toggleExpand(id: string): void {
    this.expandedId.update((eid) => (eid === id ? null : id));
  }

  prevPage(): void {
    this.page.update((p) => Math.max(0, p - 1));
  }

  nextPage(): void {
    this.page.update((p) => Math.min(this.totalPages() - 1, p + 1));
  }

  getChannelIcon(channel: string): string {
    return channel === 'local' ? 'store' : channel === 'whatsapp' ? 'chat' : 'sell';
  }

  refresh(): void {
    this.salesHistoryService.refresh();
    this.transferHistoryService.refresh();
    this.stockMovementService.refresh();
  }

  async confirmCancel(saleId: string): Promise<void> {
    if (window.confirm('¿Confirmar devolución de esta venta? Se restaurará el stock.')) {
      await this.salesHistoryService.cancelSale(saleId);
    }
  }

  editSale(saleId: string): void {
    this.router.navigate(['/ventas/nueva'], { queryParams: { edit: saleId } });
  }

  editTransfer(transferId: string): void {
    this.router.navigate(['/trasladar-stock'], { queryParams: { edit: transferId } });
  }

  editIngreso(referenceId: string): void {
    this.router.navigate(['/ingreso'], { queryParams: { edit: referenceId } });
  }

  async deleteSale(saleId: string): Promise<void> {
    await this.salesHistoryService.hardDeleteSale(saleId);
  }

  async deleteTransfer(transferId: string): Promise<void> {
    await this.transferHistoryService.hardDeleteTransfer(transferId);
  }

  async deleteIngresoGroup(referenceId: string): Promise<void> {
    await this.stockMovementService.deleteIngresoGroup(referenceId);
  }
}
