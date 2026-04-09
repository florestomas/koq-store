import { inject, Injectable } from '@angular/core';
import { USERS } from '../../mocks/users.mock';
import { delay, Observable, of } from 'rxjs';

export enum ESTADO {
  SUCCESS = 1,
  FAIL = 2,
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  login(user: string, password?: string): Observable<ESTADO> {
    let userLogIn = USERS.find((users) => users.user == user);

    if (userLogIn?.user != user) return of(ESTADO.FAIL);
    if (userLogIn?.password != password) return of(ESTADO.FAIL);

    return of(ESTADO.SUCCESS);
  }
}
