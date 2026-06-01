import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-layout',
  imports: [SidebarComponent, RouterOutlet, MatIcon],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  readonly sidebarOpen = signal(false);
}
