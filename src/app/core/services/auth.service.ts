import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { getSupabase } from './supabase.service';
import { User } from '../../interfaces/user';

export enum ESTADO {
  SUCCESS = 1,
  FAIL = 2,
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  logged: WritableSignal<boolean> = signal(false);
  currentUser: WritableSignal<User | null> = signal(null);
  isAdmin: Signal<boolean> = computed(() => this.currentUser()?.role === 'admin');
  isOperator: Signal<boolean> = computed(() => this.currentUser()?.role === 'operator');

  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const {
      data: { session },
    } = await getSupabase().auth.getSession();

    if (session?.user?.email) {
      await this.setUserFromEmail(session.user.email);
    }
  }

  async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  async login(usernameOrEmail: string, password: string): Promise<ESTADO> {
    const isEmail = usernameOrEmail.includes('@');
    let email = usernameOrEmail;

    if (!isEmail) {
      const { data } = await getSupabase()
        .from('users')
        .select('email')
        .eq('user', usernameOrEmail)
        .single();

      if (!data) return ESTADO.FAIL;
      email = data.email;
    }

    const { error } = await getSupabase().auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Login error:', error.message);
      return ESTADO.FAIL;
    }

    await this.setUserFromEmail(email);
    this.logged.set(true);
    return ESTADO.SUCCESS;
  }

  async logout(): Promise<void> {
    await getSupabase().auth.signOut();
    this.logged.set(false);
    this.currentUser.set(null);
  }

  private async setUserFromEmail(email: string): Promise<void> {
    const { data } = await getSupabase()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (data) {
      this.currentUser.set(data);
      this.logged.set(true);
    }
  }
}
