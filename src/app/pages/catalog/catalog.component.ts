import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-catalog.component',
  imports: [MatIcon, UpperCasePipe],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent { }
