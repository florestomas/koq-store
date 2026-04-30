export interface User {
  id: string;
  user: string;
  email: string;
  password: string;
  idLocation: string;
  role: 'admin' | 'operator';
}
