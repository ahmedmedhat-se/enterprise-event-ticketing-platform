export interface AuthUser {
  sub: string;
  email: string;
  role: 'fan' | 'organizer';
  tokenVersion: number;
}
