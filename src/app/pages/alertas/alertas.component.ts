import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-alertas',
  imports: [DatePipe, UpperCasePipe, MatIcon],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent {
  readonly alertService = inject(AlertService);
  readonly today = new Date();

  constructor() {
    this.alertService.refresh();
  }

  print(): void {
    window.print();
  }
}
