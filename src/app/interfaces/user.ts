export interface User {
  id: string;
  user: string;
  email: string;
  idLocation: string;
  role: 'admin' | 'operator';
}
