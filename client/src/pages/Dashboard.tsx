import {useEffect, useState} from 'react';
import {Users, WalletCards, TrendingUp, HandCoins, CalendarDays, ArrowUpRight, Plus} from 'lucide-react';
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid} from 'recharts';
import {Link} from 'react-router-dom';
import {api} from '../services/api';
import {money} from '../utils/format';
import {Spinner, PageTitle} from '../components/UI';

export default function Dashboard() {
    const [d, setD] = useState<any>(null);
    useEffect(() => {
        api.get('/dashboard').then(r => setD(r.data))
    }, []);
    if (!d) return <Spinner/>;
    const cards = [['Total Customers', d.totalCustomers, Users, 'text-blue-600 bg-blue-50'], ['Outstanding Credit', money(d.totalOutstanding), WalletCards, 'text-rose-600 bg-rose-50'], ["Today's Credit", money(d.todayCredit), TrendingUp, 'text-amber-600 bg-amber-50'], ["Today's Payments", money(d.todayPayments), HandCoins, 'text-emerald-600 bg-emerald-50']];
    return <><PageTitle title="මුල් පිටුව" subtitle="Today’s actual business overview"
                        action={<div className="flex gap-2"><Link to="/credit" className="btn-primary"><Plus size={18}/>ණය</Link><Link
                            to="/payment" className="btn-secondary">ගෙවීම</Link></div>}/>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([l, v, I, c]: any) => <div
            className="card" key={l}>
            <div className={`mb-5 inline-flex rounded-xl p-3 ${c}`}><I size={22}/></div>
            <div className="text-sm text-slate-500">{l}</div>
            <div className="mt-1 text-2xl font-black">{v}</div>
        </div>)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                    <div><h2 className="font-extrabold">Category credit</h2><p className="text-xs text-slate-500">Actual
                        active credit totals</p></div>
                    <CalendarDays className="text-slate-300"/></div>
                <div className="h-72"><ResponsiveContainer><BarChart data={d.categories}><CartesianGrid vertical={false}
                                                                                                        stroke="#eef1ee"/><XAxis
                    dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip
                    formatter={(v: any) => money(v)}/><Bar dataKey="total" fill="#39825a"
                                                           radius={[8, 8, 0, 0]}/></BarChart></ResponsiveContainer>
                </div>
            </div>
            <div className="card"><h2 className="font-extrabold">This month</h2><p
                className="mb-6 text-xs text-slate-500">Current month performance</p>
                <div className="space-y-4">
                    <div className="rounded-xl bg-forest-50 p-4"><span
                        className="text-sm text-slate-500">Credit</span><strong
                        className="mt-1 block text-xl">{money(d.monthCredit)}</strong></div>
                    <div className="rounded-xl bg-emerald-50 p-4"><span
                        className="text-sm text-slate-500">Payments</span><strong
                        className="mt-1 block text-xl">{money(d.monthPayments)}</strong></div>
                    <div className="flex justify-between border-t pt-4"><span className="text-sm text-slate-500">Active debtors</span><b>{d.customersWithOutstanding}</b>
                    </div>
                </div>
            </div>
        </div>
        {d.totalCustomers === 0 && <div className="card mt-4 flex flex-wrap items-center gap-4 border-dashed">
            <div className="rounded-xl bg-forest-50 p-3"><ArrowUpRight className="text-forest-600"/></div>
            <div><b>No financial activity yet.</b><p className="text-sm text-slate-500">Start by registering a customer
                or recording a transaction.</p></div>
            <Link to="/customers" className="btn-primary ml-auto">Add first customer</Link></div>}</>
}
