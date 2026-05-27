import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnggdaynqpwkibfwmado.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZ2dkYXlucXB3a2liZndtYWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDc0NzQsImV4cCI6MjA4OTUyMzQ3NH0.7__k2LBXzodk3GxrRXvymWWun_4Ai7mgVkPyTORE9o4';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true },
    });
  }
  return client;
}
