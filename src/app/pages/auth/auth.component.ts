import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'auth-component',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  logInForm = new FormGroup({
    user: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  public isLoading = signal(false);

  onSubmit() {
    this.isLoading.set(true);
    console.log(this.logInForm.value)
    setTimeout(() => {
      this.isLoading.set(false);
      console.log('holaa');
    }, 2000);
  }
}
