import {useEffect, useMemo, useState} from 'react';
import {
    BarChart3,
    CalendarRange,
    Download,
    FileSpreadsheet,
    FileText,
    HandCoins,
    TrendingUp,
    Users
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {api, message} from '../services/api';
import {money} from '../utils/format';
import {PageTitle, Spinner} from '../components/UI';
import type {Customer} from '../types';
import {useTheme} from '../contexts/ThemeContext';

// High-contrast infographic palette sampled from the supplied chart reference.
const INFOGRAPHIC_CHARTS = [
    '#c7e83f', '#3fbd70', '#ffbd3f', '#ff8a52', '#ff477e',
    '#5b7cfa', '#6c63ff', '#8c36d7', '#d62bbf', '#42c7d9',
];

const now = new Date();
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

function weekRange(value: string) {
    const [yearText, weekText] = value.split('-W');
    const year = Number(yearText), week = Number(weekText);
    const fourth = new Date(Date.UTC(year, 0, 4));
    const monday = new Date(fourth);
    monday.setUTCDate(fourth.getUTCDate() - (fourth.getUTCDay() || 7) + 1 + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {from: isoDate(monday), to: isoDate(sunday)};
}

export default function Reports() {
    const {theme} = useTheme();
    const chartColors = INFOGRAPHIC_CHARTS;
    const gridColor = theme === 'dark' ? '#5a189a' : '#eabffa';
    const chartTooltip = {
        contentStyle: {
            backgroundColor: theme === 'dark' ? '#240046' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#7b2cbf' : '#d8bbff'}`,
            borderRadius: 12,
            color: theme === 'dark' ? '#f4e5ff' : '#260059'
        },
        labelStyle: {color: theme === 'dark' ? '#e0aaff' : '#6800a9', fontWeight: 700},
        itemStyle: {color: theme === 'dark' ? '#f4e5ff' : '#260059'}
    };
    const [report, setReport] = useState<any>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [mode, setMode] = useState('all');
    const [year, setYear] = useState(String(now.getFullYear()));
    const [month, setMonth] = useState(currentMonth);
    const [week, setWeek] = useState(`${now.getFullYear()}-W01`);
    const [range, setRange] = useState({from: '', to: ''});
    const [customerId, setCustomerId] = useState('');
    const [error, setError] = useState('');

    const period = useMemo(() => {
        if (mode === 'year') return {from: `${year}-01-01`, to: `${year}-12-31`};
        if (mode === 'month') {
            const [y, m] = month.split('-').map(Number);
            return {from: `${month}-01`, to: isoDate(new Date(Date.UTC(y, m, 0)))};
        }
        if (mode === 'week') return weekRange(week);
        if (mode === 'range') return range;
        return {from: '', to: ''};
    }, [mode, year, month, week, range]);

    useEffect(() => {
        api.get('/customers', {params: {limit: 100}}).then(response => setCustomers(response.data.items));
    }, []);
    useEffect(() => {
        setReport(null);
        setError('');
        const params: any = {customerId: customerId || undefined};
        if (period.from) params.from = period.from;
        if (period.to) params.to = period.to;
        api.get('/reports/overview', {params}).then(response => setReport(response.data)).catch(err => setError(message(err)));
    }, [period.from, period.to, customerId]);

    const periodLabel = mode === 'all' ? 'All recorded time' : `${period.from || 'Beginning'} to ${period.to || 'Today'}`;
    const title = customerId ? `Customer Report - ${customers.find(customer => customer._id === customerId)?.name || ''}` : 'Ape Kade Business Report';
    const exportRows = () => (report?.topCustomers || []).map((row: any) => ({
        Customer: row.name,
        'Customer ID': row.customerCode,
        Transactions: row.count,
        Credit: row.credit,
        Payments: row.payments,
        Net: row.net
    }));

    async function exportPdf() {
        const {jsPDF} = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const document = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
        const purple: [number, number, number] = [36, 0, 70];
        const violet: [number, number, number] = [123, 44, 191];
        const pink: [number, number, number] = [199, 125, 255];
        document.setFillColor(...purple);
        document.rect(0, 0, 210, 39, 'F');
        document.setFillColor(...pink);
        document.rect(0, 36, 210, 3, 'F');
        document.setTextColor(255, 255, 255);
        document.setFont('helvetica', 'bold');
        document.setFontSize(19);
        document.text('APE KADE CREDIT BOOK', 14, 16);
        document.setFont('helvetica', 'normal');
        document.setFontSize(10);
        document.text(title, 14, 24);
        document.text(periodLabel, 14, 31);
        document.setTextColor(36, 21, 54);
        const cards = [
            {
                label: 'TOTAL CREDIT',
                value: money(report.summary.totalCredit),
                color: [249, 238, 255] as [number, number, number]
            },
            {
                label: 'TOTAL PAYMENTS',
                value: money(report.summary.totalPayments),
                color: [236, 220, 248] as [number, number, number]
            },
            {
                label: 'NET MOVEMENT',
                value: money(report.summary.net),
                color: [229, 210, 245] as [number, number, number]
            },
        ];
        cards.forEach((card, index) => {
            const x = 14 + index * 61;
            document.setFillColor(...card.color);
            document.roundedRect(x, 47, 56, 25, 3, 3, 'F');
            document.setFontSize(7);
            document.setFont('helvetica', 'bold');
            document.setTextColor(100, 88, 118);
            document.text(card.label, x + 4, 55);
            document.setFontSize(12);
            document.setTextColor(36, 21, 54);
            document.text(card.value, x + 4, 66);
        });
        document.setFontSize(12);
        document.setFont('helvetica', 'bold');
        document.setTextColor(...purple);
        document.text('Customer Summary', 14, 84);
        autoTable(document, {
            startY: 89,
            head: [['Customer', 'ID', 'Tx', 'Credit', 'Payments', 'Net']],
            body: exportRows().map((row: any) => [row.Customer, row['Customer ID'], row.Transactions, row.Credit.toFixed(2), row.Payments.toFixed(2), row.Net.toFixed(2)]),
            theme: 'striped',
            headStyles: {fillColor: violet, textColor: 255},
            alternateRowStyles: {fillColor: [249, 238, 255]},
            styles: {fontSize: 8, cellPadding: 2.5},
            margin: {left: 14, right: 14}
        });
        const categoryY = (document as any).lastAutoTable.finalY + 12;
        document.setFontSize(12);
        document.setTextColor(...purple);
        document.text('Category Details', 14, categoryY);
        autoTable(document, {
            startY: categoryY + 5,
            head: [['Category', 'Transactions', 'Total Credit']],
            body: report.categories.map((item: any) => [item.name, item.count, money(item.total)]),
            headStyles: {fillColor: pink, textColor: 255},
            theme: 'grid',
            styles: {fontSize: 8},
            margin: {left: 14, right: 14}
        });
        const pages = document.getNumberOfPages();
        for (let page = 1; page <= pages; page++) {
            document.setPage(page);
            document.setDrawColor(225, 216, 238);
            document.line(14, 285, 196, 285);
            document.setFontSize(7);
            document.setTextColor(120, 105, 140);
            document.text(`Generated ${new Date().toLocaleString()}  |  Actual stored business data`, 14, 290);
            document.text(`Page ${page} of ${pages}`, 181, 290);
        }
        document.save(`ape-kade-report-${mode}-${isoDate(now)}.pdf`);
    }

    function exportCsv() {
        const rows = exportRows();
        const headers = Object.keys(rows[0] || {
            Customer: '',
            'Customer ID': '',
            Transactions: '',
            Credit: '',
            Payments: '',
            Net: ''
        });
        const csv = [headers.join(','), ...rows.map((row: any) => headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
        download(new Blob([csv], {type: 'text/csv;charset=utf-8'}), `ape-kade-report-${mode}.csv`);
    }

    async function exportExcel() {
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
            Period: periodLabel,
            'Total Credit': report.summary.totalCredit,
            'Total Payments': report.summary.totalPayments,
            Net: report.summary.net,
            'Credit Count': report.summary.creditCount,
            'Payment Count': report.summary.paymentCount
        }]), 'Summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows()), 'Customers');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.categories), 'Categories');
        XLSX.writeFile(workbook, `ape-kade-report-${mode}.xlsx`);
    }

    return <><PageTitle title="වාර්තා" subtitle="All-time reports by default, with flexible calendar filtering"
                        action={<div className="flex flex-wrap gap-2">
                            <button className="btn-secondary" disabled={!report} onClick={exportPdf}><FileText
                                size={17}/>PDF
                            </button>
                            <button className="btn-secondary" disabled={!report} onClick={exportCsv}><Download
                                size={17}/>CSV
                            </button>
                            <button className="btn-primary" disabled={!report} onClick={exportExcel}><FileSpreadsheet
                                size={17}/>Excel
                            </button>
                        </div>}/>
        <div className="card mb-4">
            <div className="mb-4 flex items-center gap-2"><CalendarRange className="text-forest-600"/><h2
                className="font-extrabold">Report period</h2><span
                className="ml-auto text-xs text-slate-500">{periodLabel}</span></div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label><span className="label">Filter type</span><select className="input" value={mode}
                                                                         onChange={event => setMode(event.target.value)}>
                    <option value="all">All time</option>
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="range">Date range</option>
                </select></label>
                {mode === 'year' && <label><span className="label">Year</span><select className="input" value={year}
                                                                                      onChange={event => setYear(event.target.value)}>{Array.from({length: 10}, (_, index) => String(now.getFullYear() - index)).map(value =>
                    <option key={value}>{value}</option>)}</select></label>}
                {mode === 'month' &&
                    <label><span className="label">Month</span><input className="input" type="month" value={month}
                                                                      onChange={event => setMonth(event.target.value)}/></label>}
                {mode === 'week' &&
                    <label><span className="label">Week</span><input className="input" type="week" value={week}
                                                                     onChange={event => setWeek(event.target.value)}/></label>}
                {mode === 'range' && <><label><span className="label">From date</span><input className="input"
                                                                                             type="date"
                                                                                             value={range.from}
                                                                                             onChange={event => setRange({
                                                                                                 ...range,
                                                                                                 from: event.target.value
                                                                                             })}/></label><label><span
                    className="label">To date</span><input className="input" type="date" value={range.to}
                                                           onChange={event => setRange({
                                                               ...range,
                                                               to: event.target.value
                                                           })}/></label></>}
                <label className={mode === 'range' ? '' : 'lg:col-span-2'}><span
                    className="label">Customer-wise report</span><select className="input" value={customerId}
                                                                         onChange={event => setCustomerId(event.target.value)}>
                    <option value="">All customers</option>
                    {customers.map(customer => <option key={customer._id}
                                                       value={customer._id}>{customer.name} ({customer.customerCode})</option>)}
                </select></label>
            </div>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
        {!report ? <Spinner/> : <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
                ['Total credit', money(report.summary.totalCredit), TrendingUp, 'bg-pink_orchid-500 text-pastel_mauve_5-200 dark:bg-indigo_velvet-900 dark:text-indigo_velvet-500'], ['Total payments', money(report.summary.totalPayments), HandCoins, 'bg-pastel_mauve_3-900 text-pastel_mauve_3-300 dark:bg-lavender_purple-900 dark:text-lavender_purple-500'], ['Net movement', money(report.summary.net), BarChart3, 'bg-pastel_mauve_2-900 text-pastel_mauve_5-200 dark:bg-royal_violet-900 dark:text-royal_violet-500'], ['Transactions', report.summary.creditCount + report.summary.paymentCount, Users, 'bg-pastel_mauve_1-900 text-bright_lavender-400 dark:bg-mauve_magic-900 dark:text-mauve_magic-400'],
            ].map(([label, value, Icon, color]: any) => <div className="card" key={label}>
                <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}><Icon size={21}/></div>
                <span className="block text-sm text-slate-500">{label}</span><b
                className="mt-1 block text-2xl">{value}</b></div>)}</div>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="card xl:col-span-2"><h2 className="font-extrabold">Credit and payment trend</h2><p
                    className="mb-4 text-xs text-slate-500">Daily totals for the selected period</p>
                    <div className="h-80"><ResponsiveContainer><AreaChart data={report.trend}><CartesianGrid
                        vertical={false} stroke={gridColor}/><XAxis dataKey="date"/><YAxis/><Tooltip {...chartTooltip}
                                                                                                     formatter={(value: any) => money(value)}/><Legend/><Area
                        type="monotone" dataKey="credit" stroke={chartColors[4]} fill={chartColors[4]}
                        fillOpacity={0.18}/><Area type="monotone" dataKey="payments" stroke={chartColors[1]}
                                                  fill={chartColors[1]}
                                                  fillOpacity={0.18}/></AreaChart></ResponsiveContainer></div>
                </div>
                <div className="card"><h2 className="font-extrabold">Credit categories</h2><p
                    className="mb-4 text-xs text-slate-500">Share of recorded credit</p>
                    <div className="h-80"><ResponsiveContainer><PieChart><Pie data={report.categories} dataKey="total"
                                                                              nameKey="name" innerRadius={55}
                                                                              outerRadius={95}
                                                                              paddingAngle={3}>{report.categories.map((_: any, index: number) =>
                        <Cell key={index}
                              fill={chartColors[index % chartColors.length]}/>)}</Pie><Tooltip {...chartTooltip}
                                                                                               formatter={(value: any) => money(value)}/><Legend/></PieChart></ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="card"><h2 className="font-extrabold">Transactions by user</h2>
                    <div className="h-72"><ResponsiveContainer><BarChart data={report.users}><CartesianGrid
                        vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip {...chartTooltip} /><Bar
                        activeBar={false} dataKey="count" fill={chartColors[6]}
                        radius={[7, 7, 0, 0]}/></BarChart></ResponsiveContainer></div>
                </div>
                <div className="card"><h2 className="font-extrabold">Monthly credit vs payments</h2><p
                    className="mb-3 text-xs text-slate-500">Month-by-month comparison for the selected period</p>
                    <div className="h-72"><ResponsiveContainer><BarChart data={report.monthlyTrend}><CartesianGrid
                        vertical={false} stroke={gridColor}/><XAxis dataKey="month"/><YAxis/><Tooltip {...chartTooltip}
                                                                                                      formatter={(value: any) => money(value)}/><Legend/><Bar
                        activeBar={false} dataKey="credit" name="Credit" fill={chartColors[4]}
                        radius={[7, 7, 0, 0]}/><Bar activeBar={false} dataKey="payments" name="Payments"
                                                    fill={chartColors[1]}
                                                    radius={[7, 7, 0, 0]}/></BarChart></ResponsiveContainer></div>
                </div>
            </div>
            <div className="card mt-4"><h2 className="mb-4 font-extrabold">Customer-wise details</h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                        <tr>
                            <th className="th">Customer</th>
                            <th className="th">Transactions</th>
                            <th className="th">Credit</th>
                            <th className="th">Payments</th>
                            <th className="th">Net</th>
                        </tr>
                        </thead>
                        <tbody>{report.topCustomers.map((row: any) => <tr key={row._id}>
                            <td className="td"><b>{row.name}</b><small
                                className="block text-slate-500">{row.customerCode}</small></td>
                            <td className="td">{row.count}</td>
                            <td className="td">{money(row.credit)}</td>
                            <td className="td">{money(row.payments)}</td>
                            <td className="td font-bold">{money(row.net)}</td>
                        </tr>)}</tbody>
                    </table>
                </div>
            </div>
        </>}
    </>;
}

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}