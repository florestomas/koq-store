import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';

@Component({
  selector: 'app-alertas',
  imports: [DatePipe, UpperCasePipe, MatIcon, ReactiveFormsModule],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent {
  readonly alertService = inject(AlertService);
  readonly catalogService = inject(CatalogService);
  readonly authService = inject(AuthService);
  readonly today = new Date();
  readonly locations = computed(() => this.catalogService.locations());

  readonly searchControl = new FormControl('');
  readonly searchTerm = signal('');

  readonly isAdmin = this.authService.isAdmin;
  readonly selectedLocationId = this.alertService.selectedLocationId;

  readonly zeroStockCount = this.alertService.zeroStockCount;
  readonly lowStockCount = this.alertService.lowStockCount;
  readonly totalCount = this.alertService.alertCount;

  readonly groupedAlerts = computed(() => {
    const alerts = this.alertService.alerts();
    const term = this.searchTerm().toLowerCase().trim();
    const filtered = term
      ? alerts.filter(
          (a) =>
            a.modelName.toLowerCase().includes(term) ||
            a.size.includes(term) ||
            a.colorName.toLowerCase().includes(term),
        )
      : alerts;

    const map = new Map<string, { modelId: string; modelName: string; items: typeof filtered }>();

    for (const alert of filtered) {
      let group = map.get(alert.modelId);
      if (!group) {
        group = { modelId: alert.modelId, modelName: alert.modelName, items: [] };
        map.set(alert.modelId, group);
      }
      group.items.push(alert);
    }

    return Array.from(map.values());
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.alertService.refresh();

    const sub = this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set((value ?? '').trim());
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  setLocationFilter(id: string | null): void {
    this.selectedLocationId.set(id);
  }

  print(): void {
    window.print();
  }
}
