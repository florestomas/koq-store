import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gnggdaynqpwkibfwmado.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZ2dkYXlucXB3a2liZndtYWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDc0NzQsImV4cCI6MjA4OTUyMzQ3NH0.7__k2LBXzodk3GxrRXvymWWun_4Ai7mgVkPyTORE9o4';

const STORAGE_BUCKET = 'product-images';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true },
    });
  }
  return client;
}

export async function uploadProductImage(file: File, storagePath: string): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() || 'png';
  const filePath = `${storagePath}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteProductImage(imageUrl: string): Promise<void> {
  const parts = imageUrl.split('/product-images/');
  const path = parts.length > 1 ? parts[1] : null;
  if (!path) return;

  const { error } = await getSupabase().storage.from(STORAGE_BUCKET).remove([path]);
  if (error) console.error('Error deleting image:', error.message);
}
