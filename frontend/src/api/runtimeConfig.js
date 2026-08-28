const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export const API_URL = `${backendUrl.replace(/\/$/, '')}/api`;
export const SOCKET_URL = backendUrl.replace(/\/$/, '');
