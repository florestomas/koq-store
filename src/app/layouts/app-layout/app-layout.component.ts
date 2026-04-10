import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SidebarComponent } from "../../shared/sidebar/sidebar.component";

@Component({
  selector: 'app-layout',
  imports: [SidebarComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent { }
