import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { StockBadgeComponent } from '../stock-badge.component/stock-badge.component';

@Component({
  selector: 'app-product-card',
  imports: [MatIcon, StockBadgeComponent],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  public cardExpanded = signal(true);
}
