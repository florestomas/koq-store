import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { NavItemComponent } from './nav-item/nav-item.component';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';
import { ReceptionService } from '../../core/services/reception.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [NavItemComponent, MatIcon, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly alertService = inject(AlertService);
  private readonly receptionService = inject(ReceptionService);
  readonly authService = inject(AuthService);
  readonly alertCount = this.alertService.alertCount;
  readonly receptionCount = this.receptionService.pendingCount;
  readonly isAdmin = this.authService.isAdmin;

  toggleAdminMode(): void {
    this.authService.adminOverride.update((v) => !v);
  }

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
}
