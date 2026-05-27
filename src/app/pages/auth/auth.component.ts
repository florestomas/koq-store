import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, ESTADO } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'auth-component',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  logInForm = new FormGroup({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', Validators.required),
  });
  private router = inject(Router);
  private authService = inject(AuthService);
  isLoading = signal(false);
  showLogInError = signal(false);

  async onSubmit() {
    this.isLoading.set(true);
    this.showLogInError.set(false);

    const estado = await this.authService.login(
      this.logInForm.value.email ?? '',
      this.logInForm.value.password ?? '',
    );

    if (estado === ESTADO.SUCCESS) {
      this.router.navigate(['']);
    } else {
      this.showLogInError.set(true);
      this.logInForm.reset();
    }
    this.isLoading.set(false);
  }
}
