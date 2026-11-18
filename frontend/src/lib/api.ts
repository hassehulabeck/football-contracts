import axios from 'axios';
import { getActiveLocale, localiseApiMessage } from './apiMessages';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});

// The API answers in English; what a player sees of it is shown in their
// language. Only the human-readable `error` and `message` fields are touched.
function localise(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const d = data as { error?: unknown; message?: unknown };
  const locale = getActiveLocale();
  if (typeof d.error === 'string') d.error = localiseApiMessage(d.error, locale);
  if (typeof d.message === 'string') d.message = localiseApiMessage(d.message, locale);
}

api.interceptors.response.use(
  (res) => {
    localise(res.data);
    return res;
  },
  (err) => {
    localise(err?.response?.data);
    return Promise.reject(err);
  },
);

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Persist token across page loads
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('fc_token');
  if (stored) setAuthToken(stored);
}
