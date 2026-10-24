import axios, {type AxiosError, type AxiosResponse} from 'axios';

type ClientEnvironment = { readonly VITE_API_URL?: string };
type ApiErrorBody = { message?: string };
const clientEnvironment = (import.meta as ImportMeta & { readonly env?: ClientEnvironment }).env;
let redirectingToLogin = false;

export const api = axios.create({
    baseURL: clientEnvironment?.VITE_API_URL || '/api',
    withCredentials: true,
    timeout: 12_000,
    headers: {'Content-Type': 'application/json'},
});

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<ApiErrorBody>) => {
        // A hard navigation fully destroys every protected component and pending
        // spinner. This avoids leaving the Users page mounted under the /login URL.
        if (error.response?.status === 401 &&
            window.location.pathname !== '/login' &&
            !redirectingToLogin) {
            redirectingToLogin = true;
            window.location.replace('/login');
        }
        return Promise.reject(error);
    },
);

export function message(error: unknown): string {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
        if (error.response?.data?.message) return error.response.data.message;
        if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
    }
    return 'Something went wrong. Please try again.';
}