import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavItemComponent } from "./nav-item.component/nav-item.component";

@Component({
  selector: 'app-sidebar',
  imports: [NavItemComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent { }
