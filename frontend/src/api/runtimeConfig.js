const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
const backendUrl = configuredBackendUrl || (import.meta.env.DEV
	? 'http://localhost:5001'
	: 'https://h20-xlrb.onrender.com');

if (!backendUrl) {
	throw new Error('Missing VITE_BACKEND_URL. Set it on the frontend Render service and rebuild.');
}

export const API_URL = `${backendUrl.replace(/\/$/, '')}/api`;
export const SOCKET_URL = backendUrl.replace(/\/$/, '');
