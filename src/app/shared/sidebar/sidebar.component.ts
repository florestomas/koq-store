import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavItemComponent } from './nav-item/nav-item.component';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-sidebar',
  imports: [NavItemComponent, MatIcon, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly alertService = inject(AlertService);
  readonly alertCount = this.alertService.alertCount;
  user = signal('TALLER');
}
