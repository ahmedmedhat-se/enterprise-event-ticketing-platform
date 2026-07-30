import apiClient from '../shared/api/client';
import type { AuthResponse, LoginCredentials, SignupData, OrganizerSignupData } from '../types/auth.types';

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/user/login', credentials);
  return data;
}

export async function loginOrganizer(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/organizer/login', credentials);
  return data;
}

export async function signupUser(data: SignupData): Promise<AuthResponse> {
  const { data: res } = await apiClient.post<AuthResponse>('/user/signup', data);
  return res;
}

export async function signupOrganizer(data: OrganizerSignupData): Promise<AuthResponse> {
  const { data: res } = await apiClient.post<AuthResponse>('/organizer/signup', data);
  return res;
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>('/user/refresh-token');
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post('/user/logout');
}

export async function logoutOrganizer(): Promise<void> {
  await apiClient.post('/organizer/logout');
}

export async function getMe(): Promise<{ user: import('../types/auth.types').AuthUser }> {
  const { data } = await apiClient.get('/user/me');
  return data;
}

export async function getOrganizerMe(): Promise<{ user: import('../types/auth.types').AuthUser }> {
  const { data } = await apiClient.get('/organizer/me');
  return data;
}
