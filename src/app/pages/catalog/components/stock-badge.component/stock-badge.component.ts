import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stock-badge',
  imports: [],
  templateUrl: './stock-badge.component.html',
  styleUrl: './stock-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockBadgeComponent {
  readonly stock = input<number>(0);
  readonly minStock = input<number>(0);
}
