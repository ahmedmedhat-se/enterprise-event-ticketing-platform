export const API_URL = import.meta.env.VITE_API_URL;
export const WS_URL = import.meta.env.VITE_WS_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL is not defined. Copy .env.example to .env and set it.');
}

if (!WS_URL) {
  throw new Error('VITE_WS_URL is not defined. Copy .env.example to .env and set it.');
}