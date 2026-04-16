import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {MatIconModule} from '@angular/material/icon'

@Component({
  selector: 'app-nav-item',
  imports: [MatIconModule],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavItemComponent {

  @Input() iconName : string = 'inventory_2';
  @Input() navName : string = 'LOREMIMPSUM'

}
