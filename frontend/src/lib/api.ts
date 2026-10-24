export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ApiOptions extends RequestInit {
  token?: string;
  userId?: string | number;
  userRoles?: string;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, userId, userRoles, headers: customHeaders, ...restOptions } = options;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const endpointPath = normalizedEndpoint.split('?')[0];
  const isAuthRequest = endpointPath === '/api/auth/login' || endpointPath === '/api/auth/register'
    || endpointPath.startsWith('/api/auth/supabase/');

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  const isFormData = typeof FormData !== 'undefined' && restOptions.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  const activeToken = token || storedToken;
  let activeUserId = userId;
  let activeRoles = userRoles;

  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      if (!activeUserId && parsedUser.id) activeUserId = parsedUser.id;
      if (!activeRoles && parsedUser.roles) activeRoles = Array.isArray(parsedUser.roles) ? parsedUser.roles.join(',') : parsedUser.roles;
    } catch {}
  }

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  if (activeUserId) {
    headers['X-User-Id'] = String(activeUserId);
  }
  if (activeRoles) {
    headers['X-User-Roles'] = String(activeRoles);
  }

  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, { headers, ...restOptions });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Unable to reach the healthcare service. Please check your connection and try again.');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.error) errorMessage = errorData.error;
    } catch {}

    if (response.status === 401 && !isAuthRequest && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login?session=expired');
      }
    }

    if (response.status >= 500) errorMessage = response.status === 503
      ? 'This service is temporarily unavailable. Please try again shortly.'
      : 'The service could not complete this request. Please try again.';
    throw new ApiError(response.status, errorMessage);
  }

  if (response.status === 204) return {} as T; // 204 No Content
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // Some successful endpoints (for example registration) return text/plain.
    return text as T;
  }
}
