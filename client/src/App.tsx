import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {AuthProvider, useAuth} from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import FinancialForm from './pages/FinancialForm';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import {BookOpen, LoaderCircle} from 'lucide-react';
import {ThemeProvider} from './contexts/ThemeContext';

function AuthLoading() {
    return <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pink_orchid-900 dark:bg-dark_amethyst-500">
        <div className="rounded-2xl bg-forest-900 p-4 text-white"><BookOpen size={30}/></div>
        <div className="flex items-center gap-2 text-sm font-bold text-forest-700 dark:text-mauve_magic-500">
            <LoaderCircle className="animate-spin" size={20}/>Checking your secure session…
        </div>
    </div>
}

function Guard({admin = false, children}: { admin?: boolean; children: any }) {
    const {user, loading} = useAuth();
    if (loading) return <AuthLoading/>;
    if (!user) return <Navigate to="/login" replace/>;
    if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace/>;
    return children
}

function Router() {
    const {user, loading} = useAuth();
    return <Routes><Route path="/login"
                          element={loading ? <AuthLoading/> : user ? <Navigate to="/"/> : <Login/>}/><Route
        element={<Guard><AppLayout/></Guard>}><Route index element={<Dashboard/>}/><Route path="customers"
                                                                                          element={<Customers/>}/><Route
        path="customers/:id" element={<CustomerDetail/>}/><Route path="credit"
                                                                 element={<FinancialForm type="credit"/>}/><Route
        path="payment" element={<FinancialForm type="payment"/>}/><Route path="transactions" element={<Transactions/>}/><Route
        path="reports" element={<Reports/>}/><Route path="profile" element={<Profile/>}/><Route path="users"
                                                                                                element={<Guard
                                                                                                    admin><Users/></Guard>}/><Route
        path="audit" element={<Guard admin><Audit/></Guard>}/><Route path="settings" element={<Guard
        admin><Settings/></Guard>}/></Route><Route path="*" element={<Navigate to="/"/>}/></Routes>
}

export default function App() {
    return <ThemeProvider><BrowserRouter><AuthProvider><Router/></AuthProvider></BrowserRouter></ThemeProvider>
}