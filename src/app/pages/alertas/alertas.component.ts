import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { LOCATIONS } from '../../mocks/location.mock';

@Component({
  selector: 'app-alertas',
  imports: [DatePipe, UpperCasePipe, MatIcon],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent {
  readonly alertService = inject(AlertService);
  readonly authService = inject(AuthService);
  readonly today = new Date();
  readonly locations = LOCATIONS;

  readonly isAdmin = this.authService.isAdmin;
  readonly selectedLocationId = this.alertService.selectedLocationId;

  readonly zeroStockCount = this.alertService.zeroStockCount;
  readonly lowStockCount = this.alertService.lowStockCount;
  readonly totalCount = this.alertService.alertCount;

  readonly viewMode = signal<'flat' | 'grouped'>(
    (localStorage.getItem('alertas-view-mode') as 'flat' | 'grouped') ?? 'flat',
  );

  readonly groupedAlerts = computed(() => {
    const alerts = this.alertService.alerts();
    const map = new Map<string, { modelId: string; modelName: string; items: typeof alerts }>();

    for (const alert of alerts) {
      let group = map.get(alert.modelId);
      if (!group) {
        group = { modelId: alert.modelId, modelName: alert.modelName, items: [] };
        map.set(alert.modelId, group);
      }
      group.items.push(alert);
    }

    return Array.from(map.values());
  });

  constructor() {
    this.alertService.refresh();
  }

  setLocationFilter(id: string | null): void {
    this.selectedLocationId.set(id);
  }

  toggleViewMode(): void {
    this.viewMode.update((mode) => {
      const next = mode === 'flat' ? 'grouped' : 'flat';
      localStorage.setItem('alertas-view-mode', next);
      return next;
    });
  }

  print(): void {
    window.print();
  }
}
