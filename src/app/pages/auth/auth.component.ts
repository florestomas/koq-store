import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, ESTADO } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { delay } from 'rxjs';

@Component({
  selector: 'auth-component',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})

export class AuthComponent {
  logInForm = new FormGroup({ /* Se puede hacer sin new */
    user: new FormControl<string>('', Validators.required),
    password: new FormControl<string>('', Validators.required),
  })
  private router = inject(Router)
  private authService = inject(AuthService)
  isLoading = signal(false);/*  */
  showLogInError = signal(false);

  onSubmit() {
    this.isLoading.set(true);
    this.showLogInError.set(false);

    this.authService.login(this.logInForm.value.user!, this.logInForm.value.password!).pipe(delay(2000)).subscribe({
      next: (estado : ESTADO)=>{
        if(estado == ESTADO.SUCCESS){
          this.router.navigate(['catalogo'])
          this.isLoading.set(false)
        }
        if(estado == ESTADO.FAIL){
          console.log('fail')
          this.showLogInError.set(true);
          this.isLoading.set(false)
          this.logInForm.reset()
        }
      },
    })

  }

}
