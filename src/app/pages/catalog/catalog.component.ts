import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-catalog.component',
  imports: [MatIcon, UpperCasePipe, ProductCardComponent, SearchBarComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent {
  protected readonly catalogService = inject(CatalogService);
  protected readonly authService = inject(AuthService);

  get locations() { return this.catalogService.getLocations(); }
  readonly isAdmin = this.authService.isAdmin;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.catalogService.setSearchTerm('');
      this.catalogService.setSelectedCategory(null);
    });
  }
}
