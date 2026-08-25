import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {api} from '../services/api';
import type {User} from '../types';

const C = createContext<any>(null);

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true);
    useEffect(() => {
        api.get('/auth/me').then(r => setUser(r.data.user)).catch(() => setUser(null)).finally(() => setLoading(false))
    }, []);
    const login = async (username: string, password: string) => {
        const {data} = await api.post('/auth/login', {username, password});
        setUser(data.user)
    };
    const logout = async () => {
        await api.post('/auth/logout');
        setUser(null)
    };
    return <C.Provider value={{user, setUser, loading, login, logout}}>{children}</C.Provider>
}

export const useAuth = () => useContext(C);
