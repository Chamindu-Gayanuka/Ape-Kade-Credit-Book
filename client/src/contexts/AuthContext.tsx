import {createContext, type ReactNode, useContext, useEffect, useState} from 'react';
import {api} from '../services/api';
import type {User} from '../types';

type AuthContextValue = {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        api.get('/auth/me')
            .then(response => {
                if (active) setUser(response.data.user);
            })
            .catch(() => {
                if (active) setUser(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    async function login(username: string, password: string) {
        const {data} = await api.post('/auth/login', {username, password});
        setUser(data.user);
    }

    async function logout() {
        // Clear local authentication regardless of API/network state, then perform a
        // hard navigation so no protected child component can remain mounted.
        setUser(null);
        setLoading(false);
        try {
            await api.post('/auth/logout');
        } catch { /* session may already be expired */
        }
        window.location.replace('/login');
    }

    return <AuthContext.Provider value={{user, setUser, loading, login, logout}}>
        {children}
    </AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside AuthProvider');
    return value;
}