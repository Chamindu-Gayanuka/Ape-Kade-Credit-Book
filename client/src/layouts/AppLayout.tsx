import {NavLink, Outlet} from 'react-router-dom';
import {
    BarChart3,
    BookOpen,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Menu,
    ReceiptText,
    ScrollText,
    Settings,
    UserCog,
    UserRound,
    Users,
    X,
} from 'lucide-react';
import {useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const common = [
    ['/', 'මුල් පිටුව', 'Dashboard', LayoutDashboard],
    ['/customers', 'ගනුදෙනුකරුවන්', 'Customers', Users],
    ['/credit', 'ණය ගනුදෙනුව', 'Record credit', ReceiptText],
    ['/payment', 'ගෙවීමක්', 'Record payment', CreditCard],
    ['/transactions', 'ගනුදෙනු ඉතිහාසය', 'Transactions', BookOpen],
    ['/reports', 'වාර්තා', 'Reports', BarChart3],
] as const;
const admin = [
    ['/users', 'පරිශීලකයන්', 'Users', UserCog],
    ['/audit', 'ක්‍රියාකාරකම්', 'Audit logs', ScrollText],
    ['/settings', 'සැකසුම්', 'Settings', Settings],
] as const;

export default function AppLayout() {
    const {user, logout} = useAuth();
    const [open, setOpen] = useState(false);
    const navigation = user?.role === 'ADMIN' ? [...common, ...admin] : common;

    return <div className="min-h-screen overflow-x-hidden">
        <aside
            className={`no-print fixed inset-y-0 left-0 z-40 flex w-72 max-w-[88vw] flex-col bg-forest-900 text-white dark:bg-deep_amethyst-500 shadow-2xl transition-transform xl:translate-x-0 xl:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-5">
                <div className="rounded-xl bg-gold p-2 text-forest-900"><BookOpen/></div>
                <div className="min-w-0">
                    <div className="truncate font-extrabold">අපේ කඩේ ණය පොත</div>
                    <div className="text-xs text-white/60">Ape Kade Credit Book</div>
                </div>
                <button className="ml-auto rounded-lg p-2 hover:bg-white/10 xl:hidden" onClick={() => setOpen(false)}
                        aria-label="Close menu"><X/></button>
            </div>
            <nav className="app-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3 pb-6">
                {navigation.map(([to, sinhala, english, Icon]) => <NavLink
                    key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
                    className={({isActive}) => `flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 ${isActive ? 'bg-pink_orchid-900 text-pastel_mauve_5-200 shadow-sm dark:bg-mauve_magic-500 dark:text-dark_amethyst-500' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                >
                    <Icon size={20} className="shrink-0"/>
                    <span className="min-w-0"><b className="block truncate text-sm">{sinhala}</b><small
                        className="block truncate text-xs opacity-60">{english}</small></span>
                </NavLink>)}
            </nav>
            <div className="shrink-0 border-t border-white/10 px-4 py-3 text-center text-[10px] text-white/35">APE KADE
                · SECURE CREDIT BOOK
            </div>
        </aside>

        {open && <button className="fixed inset-0 z-30 bg-black/50 xl:hidden" onClick={() => setOpen(false)}
                         aria-label="Close menu overlay"/>}

        <div className="min-w-0 xl:pl-72">
            <header
                className="no-print sticky top-0 z-20 flex h-20 min-w-0 items-center border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-5 lg:px-8">
                <button className="mr-3 rounded-xl p-2 hover:bg-slate-100 xl:hidden" onClick={() => setOpen(true)}
                        aria-label="Open menu"><Menu/></button>
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold sm:max-w-none">{user?.fullName}</div>
                    <div className="text-xs text-slate-500">{user?.role}</div>
                </div>
                <div className="ml-auto flex shrink-0 gap-1.5 sm:gap-2">
                    <ThemeToggle compact/>
                    <NavLink to="/profile" className="btn-secondary px-3"><UserRound size={18}/><span
                        className="hidden md:inline">Profile</span></NavLink>
                    <button className="btn-secondary px-3" onClick={logout}><LogOut size={18}/><span
                        className="hidden md:inline">Logout</span></button>
                </div>
            </header>
            <main className="mx-auto min-w-0 max-w-[1500px] p-3 sm:p-5 lg:p-7 2xl:p-8"><Outlet/></main>
        </div>
    </div>;
}