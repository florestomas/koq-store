import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NavItemComponent } from './nav-item/nav-item.component';
import { MatIcon } from '@angular/material/icon';
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
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  readonly alertCount = this.alertService.alertCount;
  readonly receptionCount = this.receptionService.pendingCount;
  readonly isAdmin = this.authService.isAdmin;

  toggleAdminMode(): void {
    this.authService.adminOverride.update((v) => !v);
  }

  logout(): void {
    this.authService.logout();
    this.close.emit();
    this.router.navigate(['/login']);
  }

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
}
