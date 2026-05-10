import { API_BASE_URL } from '../../utils/supabase-client';

export async function apiRequest(
  endpoint: string,
  accessToken: string | null,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}