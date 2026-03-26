export interface User {
  id: string
  name: string
  email: string
  password: string
  idLocation: string
  role: 'admin' | 'operator'
}
