import {type FormEvent, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {BookOpen, Eye, EyeOff, LoaderCircle} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {message} from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const {login} = useAuth();
    const navigate = useNavigate();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await login(username.trim(), password);
            navigate('/', {replace: true});
        } catch (requestError) {
            setError(message(requestError));
        } finally {
            setBusy(false);
        }
    }

    return <div className="relative flex min-h-screen">
        <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
            <ThemeToggle compact/>
        </div>

        <section
            className="hidden flex-1 flex-col justify-between bg-forest-900 p-12 text-white dark:bg-deep_amethyst-500 lg:flex">
            <div className="flex items-center gap-3 text-lg font-bold">
                <BookOpen className="text-gold"/>APE KADE
            </div>
            <div>
                <h1 className="max-w-xl text-6xl font-black leading-tight">
                    විශ්වාසයෙන් ලියන<br/>
                    <span className="text-gold">ඩිජිටල් ණය පොත.</span>
                </h1>
                <p className="mt-6 max-w-lg text-white/60">
                    Secure customer credit, payment and transaction management for your shop.
                </p>
            </div>
            <small className="text-white/40">අපේ කඩේ ණය පොත · Secure &amp; auditable</small>
        </section>

        <section
            className="flex w-full items-center justify-center bg-pink_orchid-900 p-6 dark:bg-dark_amethyst-500 lg:w-[520px]">
            <form onSubmit={submit} className="w-full max-w-sm">
                <div className="mb-9 lg:hidden">
                    <BookOpen className="mb-4 text-forest-600"/>
                    <h1 className="text-3xl font-black">අපේ කඩේ ණය පොත</h1>
                    <p className="text-sm text-slate-500">Ape Kade Credit Book</p>
                </div>

                <h2 className="text-2xl font-extrabold">Welcome back</h2>
                <p className="mb-7 mt-1 text-sm text-slate-500">ඔබගේ ගිණුමට පිවිසෙන්න</p>

                {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>}

                <label className="label" htmlFor="login-username">Username</label>
                <input
                    id="login-username"
                    className="input mb-4"
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                />

                <label className="label" htmlFor="login-password">Password</label>
                <div className="relative mb-6">
                    <input
                        id="login-password"
                        className="input pr-12"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-3 text-slate-400"
                        onClick={() => setShowPassword(value => !value)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                </div>

                <button className="btn-primary w-full" disabled={busy}>
                    {busy ? <><LoaderCircle className="animate-spin" size={19}/>Logging in…</> : 'Login'}
                </button>
            </form>
        </section>
    </div>;
}