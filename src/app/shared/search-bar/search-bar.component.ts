import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';

@Component({
  selector: 'app-search-bar',
  imports: [MatIcon, ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnDestroy {
  searchControl = new FormControl('', { nonNullable: true });
  private sub: Subscription;

  constructor() {
    const catalogService = inject(CatalogService);
    this.sub = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => catalogService.setSearchTerm(value));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
