export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'fan' | 'organizer';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
