import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NavItemComponent } from "./nav-item.component/nav-item.component";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-sidebar',
  imports: [NavItemComponent, MatIcon],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  user = signal('TALLER CARABOBO')
}
