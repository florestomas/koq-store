import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

//import { USERS } from '../../mocks/users.mock'; No se importa Users porque la logica la hacemos en el service

@Component({
  selector: 'auth-component',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  authService = inject(AuthService)
  fb = inject(FormBuilder)

  miformgropu = this.fb.group({
    'user': ["",Validators.required],
    'password':["", Validators.required]
  })
  onLogin(){
    this.authService.login('aaaa');
  }

  mivariable = "hola"
}
