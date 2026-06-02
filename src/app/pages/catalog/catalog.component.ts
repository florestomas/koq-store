import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { SearchBarComponent } from '../../shared/search-bar/search-bar.component';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthService } from '../../core/services/auth.service';
import {
  FilterModalComponent,
  FilterModalData,
  FilterModalResult,
} from '../../shared/filter-modal/filter-modal.component';

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
  private readonly dialog = inject(MatDialog);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.catalogService.setSearchTerm('');
      this.catalogService.setSelectedCategory(null);
    });
  }

  openFilters(): void {
    const data: FilterModalData = {
      locations: this.catalogService.getLocations(),
      isAdmin: this.authService.isAdmin(),
      currentLocationId: this.catalogService.locationFilterId(),
      currentStockFilter: this.catalogService.stockFilter(),
    };

    const dialogRef = this.dialog.open<FilterModalComponent, FilterModalData, FilterModalResult>(
      FilterModalComponent,
      { data },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.catalogService.setLocationFilter(result.locationId);
        this.catalogService.setStockFilter(result.stockFilter);
      }
    });
  }

  toggleAlerts(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.catalogService.setStockFilter(checked ? 'low' : 'all');
  }
}
