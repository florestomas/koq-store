import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  login(user: string, password?:string){
    console.log(user);
  }

  constructor() { }
}
