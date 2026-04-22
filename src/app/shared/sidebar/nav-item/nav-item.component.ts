import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {MatIconModule} from '@angular/material/icon'
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-nav-item',
  imports: [MatIconModule, RouterLink],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavItemComponent {

  @Input() iconName : string = 'inventory_2';
  @Input() navName : string = 'LOREMIMPSUM'
  @Input() navLink : string = '/sape'

}
