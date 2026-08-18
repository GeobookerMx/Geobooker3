import { supabase } from '../lib/supabase';

export async function getAuthenticatedJsonHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Authentication required');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function getOptionalAuthenticatedJsonHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const { data, error } = await supabase.auth.getSession();
  if (error) return headers;
  const token = data.session?.access_token;
  return token ? { ...headers, 'Authorization': `Bearer ${token}` } : headers;
}
