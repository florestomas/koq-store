import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-catalog.component',
  imports: [MatIcon, UpperCasePipe, ProductCardComponent, ReactiveFormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent {
  protected readonly catalogService = inject(CatalogService);
  protected readonly authService = inject(AuthService);

  readonly searchControl = new FormControl('');
  readonly searchTerm = this.catalogService.searchTerm;

  get locations() { return this.catalogService.getLocations(); }
  readonly isAdmin = this.authService.isAdmin;

  constructor() {
    const sub = this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => {
        this.catalogService.setSearchTerm(value ?? '');
      });

    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.catalogService.setSearchTerm('');
      this.catalogService.setSelectedCategory(null);
    });
  }
}
