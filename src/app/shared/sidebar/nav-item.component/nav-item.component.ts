import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-nav-item',
  imports: [],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavItemComponent { }
