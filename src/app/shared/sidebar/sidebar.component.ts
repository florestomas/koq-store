import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavItemComponent } from './nav-item/nav-item.component';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';
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
  readonly authService = inject(AuthService);
  readonly alertCount = this.alertService.alertCount;
  readonly isAdmin = this.authService.isAdmin;
}
