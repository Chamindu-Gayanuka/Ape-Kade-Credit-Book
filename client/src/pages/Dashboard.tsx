import {useEffect, useState} from 'react';
import {ArrowUpRight, HandCoins, PiggyBank, Plus, Scale, TrendingUp, Users, WalletCards} from 'lucide-react';
import {Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Link} from 'react-router-dom';
import {api, message} from '../services/api';
import {money} from '../utils/format';
import {PageTitle, Spinner} from '../components/UI';
import {useTheme} from '../contexts/ThemeContext';

// High-contrast infographic palette sampled from the supplied chart reference.
const INFOGRAPHIC_CHARTS = [
    '#c7e83f', // lime
    '#3fbd70', // green
    '#ffbd3f', // yellow
    '#ff8a52', // orange
    '#ff477e', // coral pink
    '#5b7cfa', // blue
    '#6c63ff', // indigo
    '#8c36d7', // purple
    '#d62bbf', // magenta
    '#42c7d9', // cyan
];

type DashboardPeriod = 'week' | 'month' | 'year';

export default function Dashboard() {
    const {theme} = useTheme();
    const [data, setData] = useState<any>(null);
    const [categoryPeriod, setCategoryPeriod] = useState<DashboardPeriod>('month');
    const [summaryPeriod, setSummaryPeriod] = useState<DashboardPeriod>('month');
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        setError('');
        api.get('/dashboard', {params: {categoryPeriod, summaryPeriod}, signal: controller.signal})
            .then(response => {
                if (active) setData(response.data);
            })
            .catch(requestError => {
                if (active) setError(message(requestError));
            });
        return () => {
            active = false;
            controller.abort();
        };
    }, [categoryPeriod, summaryPeriod, retry]);
    if (!data) return error ? <div className="card text-sm" role="alert">
        <p>Unable to load the dashboard: {error}</p>
        <button type="button" className="btn-secondary mt-3" onClick={() => setRetry(value => value + 1)}>Try again
        </button>
    </div> : <Spinner/>;

    const dark = theme === 'dark';
    const chartColors = INFOGRAPHIC_CHARTS;
    const gridColor = dark ? '#5a189a' : '#eabffa';
    const tooltip = {
        contentStyle: {
            backgroundColor: dark ? '#240046' : '#ffffff',
            border: `1px solid ${dark ? '#7b2cbf' : '#d8bbff'}`,
            borderRadius: 12,
            color: dark ? '#f4e5ff' : '#260059'
        },
        labelStyle: {color: dark ? '#e0aaff' : '#6800a9', fontWeight: 700},
        itemStyle: {color: dark ? '#f4e5ff' : '#260059'},
    };
    const cards = [
        ['Total Customers', data.totalCustomers, Users, 'text-pastel_mauve_5-200 bg-pink_orchid-500 dark:text-indigo_ink-800 dark:bg-indigo_ink-300'],
        ['Outstanding Credit', money(data.totalOutstanding), WalletCards, 'text-pastel_mauve_4-200 bg-pastel_mauve_1-900 dark:text-mauve_magic-500 dark:bg-indigo_velvet-300'],
        ["Today's Credit", money(data.todayCredit), TrendingUp, 'text-pastel_mauve_5-200 bg-pastel_mauve_2-900 dark:text-mauve_magic-500 dark:bg-royal_violet-300'],
        ["Today's Payments", money(data.todayPayments), HandCoins, 'text-pastel_mauve_3-300 bg-pastel_mauve_3-900 dark:text-mauve-500 dark:bg-lavender_purple-200'],
        ['Customer Advances', money(data.totalAdvances), PiggyBank, 'text-pastel_mauve_2-300 bg-pastel_mauve_4-900 dark:text-mauve-500 dark:bg-indigo_ink-300'],
        ['Monthly Net', money(data.monthCredit - data.monthPayments), Scale, 'text-pastel_mauve_5-200 bg-pink_orchid-500 dark:text-mauve_magic-500 dark:bg-deep_amethyst-300'],
    ];

    return <>
        <PageTitle title="මුල් පිටුව" subtitle="Today’s actual business overview"
                   action={<div className="flex gap-2"><Link to="/credit" className="btn-primary"><Plus
                       size={18}/>ණය</Link><Link to="/payment" className="btn-secondary">ගෙවීම</Link></div>}/>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {cards.map(([label, value, Icon, color]: any) => <div className="card" key={label}>
                <div className={`mb-5 inline-flex rounded-xl p-3 ${color}`}><Icon size={22}/></div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-black">{value}</div>
            </div>)}
        </div>

        {error && <div className="card mt-4 text-sm text-red-700" role="alert">
            Could not refresh dashboard data: {error}
            <button type="button" className="btn-secondary ml-3" onClick={() => setRetry(value => value + 1)}>Try
                again
            </button>
        </div>}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="card min-w-0 lg:col-span-2">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div><h2 className="font-extrabold">Category credit</h2>
                        <p className="text-xs text-slate-500">Active credit · this {categoryPeriod} · Colombo time</p>
                    </div>
                    <PeriodSelect label="Category credit period" value={categoryPeriod} onChange={setCategoryPeriod}/>
                </div>
                {data.categoryPeriod !== categoryPeriod ?
                    <div className="flex h-72 items-center justify-center text-sm text-slate-500"
                         role="status">{error ? 'Unable to load this period.' : 'Loading category credit…'}</div> :
                    data.categories.length ? <div className="h-72 min-w-0"><ResponsiveContainer><BarChart
                            data={data.categories}><CartesianGrid
                            vertical={false} stroke={gridColor}/><XAxis dataKey="name" axisLine={false} tickLine={false}
                                                                        tick={{
                                                                            fill: dark ? '#d9b6f9' : '#5a189a',
                                                                            fontSize: 12
                                                                        }}/><YAxis
                            axisLine={false} tickLine={false}
                            tick={{fill: dark ? '#d9b6f9' : '#5a189a', fontSize: 12}}/><Tooltip {...tooltip}
                                                                                                formatter={(value: any) => money(value)}/><Bar
                            activeBar={false} dataKey="total"
                            radius={[8, 8, 0, 0]}>{data.categories.map((_: any, index: number) => <Cell key={index}
                                                                                                        fill={chartColors[index % chartColors.length]}/>)}</Bar></BarChart></ResponsiveContainer>
                        </div> :
                        <p className="flex h-72 items-center justify-center text-center text-sm text-slate-500">No
                            active credit transactions in this {categoryPeriod}.</p>}
            </div>
            <div className="card min-w-0">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div><h2 className="font-extrabold">This {summaryPeriod}</h2>
                        <p className="text-xs text-slate-500">Current {summaryPeriod} performance · Colombo time</p>
                    </div>
                    <PeriodSelect label="Performance period" value={summaryPeriod} onChange={setSummaryPeriod}/>
                </div>
                {data.summaryPeriod !== summaryPeriod ?
                    <div className="py-8 text-center text-sm text-slate-500" role="status">
                        {error ? 'Unable to load this period.' : 'Loading performance…'}
                    </div> : <div className="space-y-4">
                        <div className="rounded-xl bg-pastel_mauve_4-900 p-4 dark:bg-indigo_ink-300"><span
                            className="text-sm text-slate-500">Credit</span><strong
                            className="mt-1 block text-xl">{money(data.periodCredit)}</strong></div>
                        <div className="rounded-xl bg-pastel_mauve_1-900 p-4 dark:bg-lavender_purple-200"><span
                            className="text-sm text-slate-500">Payments</span><strong
                            className="mt-1 block text-xl">{money(data.periodPayments)}</strong></div>
                        <p className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Current balances ·
                            all activity</p>
                        <div className="flex justify-between border-t pt-4"><span className="text-sm text-slate-500">Active debtors</span><b>{data.customersWithOutstanding}</b>
                        </div>
                        <div className="flex justify-between border-t pt-4"><span className="text-sm text-slate-500">Customer advances</span><b
                            className="text-pastel_mauve_5-200 dark:text-mauve_magic-500">{money(data.totalAdvances)}</b>
                        </div>
                        <div className="flex justify-between border-t pt-4"><span className="text-sm text-slate-500">Customers in advance</span><b>{data.customersWithAdvances}</b>
                        </div>
                    </div>}
            </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="card">
                <div className="mb-4"><h2 className="font-extrabold">Highest outstanding credit</h2><p
                    className="text-xs text-slate-500">Top 10 customers from highest to lowest</p></div>
                {data.highestCreditCustomers?.length ?
                    <div className="h-80"><ResponsiveContainer><BarChart data={data.highestCreditCustomers}
                                                                         layout="vertical"
                                                                         margin={{left: 10, right: 20}}><CartesianGrid
                        horizontal={false} stroke={gridColor}/><XAxis type="number"
                                                                      tickFormatter={(value: number) => `Rs.${value}`}/><YAxis
                        type="category" dataKey="name" width={105} tick={{fontSize: 12}}/><Tooltip {...tooltip}
                                                                                                   formatter={(value: any) => money(value)}/><Bar
                        activeBar={false} dataKey="amount" fill={chartColors[5]}
                        radius={[0, 8, 8, 0]}/></BarChart></ResponsiveContainer></div> :
                    <p className="py-16 text-center text-sm text-slate-500">No outstanding customer credit.</p>}</div>
            <div className="card">
                <div className="mb-4"><h2 className="font-extrabold">Highest customer advances</h2><p
                    className="text-xs text-slate-500">Top 5 advance payment balances</p></div>
                {data.highestAdvanceCustomers?.length ?
                    <div className="h-80"><ResponsiveContainer><BarChart data={data.highestAdvanceCustomers}
                                                                         layout="vertical"
                                                                         margin={{left: 10, right: 20}}><CartesianGrid
                        horizontal={false} stroke={gridColor}/><XAxis type="number"
                                                                      tickFormatter={(value: number) => `Rs.${value}`}/><YAxis
                        type="category" dataKey="name" width={105} tick={{fontSize: 12}}/><Tooltip {...tooltip}
                                                                                                   formatter={(value: any) => money(value)}/><Bar
                        activeBar={false} dataKey="amount" fill={chartColors[3]}
                        radius={[0, 8, 8, 0]}/></BarChart></ResponsiveContainer></div> :
                    <p className="py-16 text-center text-sm text-slate-500">No customer advance payments.</p>}</div>
        </div>

        {data.totalCustomers === 0 && <div className="card mt-4 flex flex-wrap items-center gap-4 border-dashed">
            <div className="rounded-xl bg-forest-50 p-3"><ArrowUpRight className="text-forest-600"/></div>
            <div><b>No financial activity yet.</b><p className="text-sm text-slate-500">Start by registering a customer
                or recording a transaction.</p></div>
            <Link to="/customers" className="btn-primary ml-auto">Add first customer</Link></div>}
    </>;
}

function PeriodSelect({label, value, onChange}: {
    label: string;
    value: DashboardPeriod;
    onChange: (period: DashboardPeriod) => void;
}) {
    return <label className="block w-32 max-w-full">
        <span className="sr-only">{label}</span>
        <select className="input py-2" value={value}
                onChange={event => onChange(event.target.value as DashboardPeriod)}>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
        </select>
    </label>;
}