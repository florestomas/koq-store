import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NavItemComponent } from "./nav-item/nav-item.component";
import { MatIcon } from "@angular/material/icon";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-sidebar',
  imports: [NavItemComponent, MatIcon, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  user = signal('TALLER')
}
