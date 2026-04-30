import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-catalog.component',
  imports: [MatIcon, UpperCasePipe, ProductCardComponent, SearchBarComponent,
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent {}
