import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-badge',
  imports: [],
  templateUrl: './stock-badge.component.html',
  styleUrl: './stock-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockBadgeComponent { }
