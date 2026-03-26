import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'auth-component',
  imports: [],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent { }
