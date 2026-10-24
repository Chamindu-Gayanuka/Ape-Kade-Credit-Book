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
        const [{jsPDF}, {default: html2canvas}] = await Promise.all([
            import('jspdf'),
            import('html2canvas'),
        ]);

        const safe = (value: unknown) => String(value ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const customerRows = exportRows().map((row: any) => `
      <tr>
        <td><strong>${safe(row.Customer)}</strong></td>
        <td>${safe(row['Customer ID'])}</td>
        <td>${safe(row.Transactions)}</td>
        <td>${safe(money(row.Credit))}</td>
        <td>${safe(money(row.Payments))}</td>
        <td>${safe(money(row.Net))}</td>
      </tr>`).join('');
        const categoryRows = report.categories.map((item: any) => `
      <tr><td><strong>${safe(item.name)}</strong></td><td>${safe(item.count)}</td><td>${safe(money(item.total))}</td></tr>`).join('');
        const dailyRows = (report.trend || []).map((item: any) => `
      <tr><td><strong>${safe(item.date)}</strong></td><td>${safe(money(item.credit))}</td><td>${safe(money(item.payments))}</td></tr>`).join('');
        const monthlyRows = (report.monthlyTrend || []).map((item: any) => `
      <tr><td><strong>${safe(item.month)}</strong></td><td>${safe(money(item.credit))}</td><td>${safe(money(item.payments))}</td><td>${safe(item.creditCount)}</td><td>${safe(item.paymentCount)}</td></tr>`).join('');
        const userRows = (report.users || []).map((item: any) => `
      <tr><td><strong>${safe(item.name)}</strong></td><td>${safe(item.count)}</td><td>${safe(money(item.total))}</td></tr>`).join('');

        const reportElement = document.createElement('section');
        reportElement.setAttribute('aria-hidden', 'true');
        reportElement.style.cssText = [
            'position:fixed', 'left:-10000px', 'top:0', 'width:794px', 'background:#ffffff',
            'color:#240046', 'padding:0 0 32px', 'font-family:"Noto Sans Sinhala","Noto Sans",Arial,sans-serif',
            'font-size:12px', 'line-height:1.45', 'z-index:-1',
        ].join(';');
        reportElement.innerHTML = `
      <header style="background:linear-gradient(120deg,#240046,#7b2cbf);color:white;padding:28px 34px 25px;border-bottom:6px solid #c77dff">
        <div style="font-size:24px;font-weight:900;letter-spacing:.5px">අපේ කඩේ ණය පොත</div>
        <div style="font-size:13px;font-weight:700;margin-top:2px">APE KADE CREDIT BOOK</div>
        <div style="margin-top:11px;opacity:.9">${safe(title)}</div>
        <div style="opacity:.75">${safe(periodLabel)}</div>
      </header>
      <main style="padding:24px 34px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:26px">
          <div style="background:#fff5fc;border:1px solid #ffd6f5;border-radius:12px;padding:14px">
            <div style="font-size:10px;font-weight:800;color:#7b2cbf">TOTAL CREDIT</div>
            <div style="font-size:18px;font-weight:900;margin-top:5px">${safe(money(report.summary.totalCredit))}</div>
          </div>
          <div style="background:#f8eeff;border:1px solid #e4baff;border-radius:12px;padding:14px">
            <div style="font-size:10px;font-weight:800;color:#7b2cbf">TOTAL PAYMENTS</div>
            <div style="font-size:18px;font-weight:900;margin-top:5px">${safe(money(report.summary.totalPayments))}</div>
          </div>
          <div style="background:#f6f6ff;border:1px solid #dadbff;border-radius:12px;padding:14px">
            <div style="font-size:10px;font-weight:800;color:#7b2cbf">NET MOVEMENT</div>
            <div style="font-size:18px;font-weight:900;margin-top:5px">${safe(money(report.summary.net))}</div>
          </div>
        </div>
        <h2 style="font-size:17px;margin:0 0 10px;color:#240046">Customer Summary</h2>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:26px">
          <thead><tr style="background:#7b2cbf;color:white">
            <th style="width:24%;padding:9px;text-align:left">Customer</th><th style="width:16%;padding:9px;text-align:left">ID</th>
            <th style="width:8%;padding:9px;text-align:left">Tx</th><th style="width:17%;padding:9px;text-align:left">Credit</th>
            <th style="width:18%;padding:9px;text-align:left">Payments</th><th style="width:17%;padding:9px;text-align:left">Net</th>
          </tr></thead><tbody>${customerRows}</tbody>
        </table>
        <h2 style="font-size:17px;margin:0 0 10px;color:#240046">Category Details</h2>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:26px">
          <thead><tr style="background:#9d4edd;color:white">
            <th style="padding:9px;text-align:left">Category</th><th style="padding:9px;text-align:left">Transactions</th><th style="padding:9px;text-align:left">Total Credit</th>
          </tr></thead><tbody>${categoryRows}</tbody>
        </table>
        <h2 style="font-size:17px;margin:0 0 10px;color:#240046">Daily Credit and Payments</h2>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:26px">
          <thead><tr style="background:#5b7cfa;color:white">
            <th style="padding:9px;text-align:left">Date</th><th style="padding:9px;text-align:left">Credit</th><th style="padding:9px;text-align:left">Payments</th>
          </tr></thead><tbody>${dailyRows}</tbody>
        </table>
        <h2 style="font-size:17px;margin:0 0 10px;color:#240046">Monthly Credit and Payments</h2>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:26px">
          <thead><tr style="background:#8c36d7;color:white">
            <th style="padding:9px;text-align:left">Month</th><th style="padding:9px;text-align:left">Credit</th><th style="padding:9px;text-align:left">Payments</th><th style="padding:9px;text-align:left">Credit Tx</th><th style="padding:9px;text-align:left">Payment Tx</th>
          </tr></thead><tbody>${monthlyRows}</tbody>
        </table>
        <h2 style="font-size:17px;margin:0 0 10px;color:#240046">User Activity</h2>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <thead><tr style="background:#ff8a52;color:white">
            <th style="padding:9px;text-align:left">User</th><th style="padding:9px;text-align:left">Transactions</th><th style="padding:9px;text-align:left">Total Amount</th>
          </tr></thead><tbody>${userRows}</tbody>
        </table>
        <div style="border-top:1px solid #e9ccff;margin-top:24px;padding-top:10px;font-size:10px;color:#7b2cbf">
          Generated ${safe(new Date().toLocaleString())} · Actual stored business data
        </div>
      </main>`;

        // Apply row styling without interpolating untrusted content into CSS.
        reportElement.querySelectorAll('tbody tr').forEach((row, index) => {
            (row as HTMLElement).style.background = index % 2 ? '#ffffff' : '#fdf4fe';
        });
        reportElement.querySelectorAll('td').forEach(cell => {
            (cell as HTMLElement).style.cssText = 'padding:9px;border-bottom:1px solid #f2dcff;vertical-align:top;overflow-wrap:anywhere';
        });

        document.body.appendChild(reportElement);
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                windowWidth: 794,
            });
            const pdf = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4', compress: true});
            const margin = 8;
            const printableWidth = 210 - margin * 2;
            const printableHeight = 297 - margin * 2 - 5;
            const maximumSliceHeight = Math.floor(canvas.width * (printableHeight / printableWidth));

            // Convert semantic element positions into canvas pixels. Page boundaries are
            // then moved to the beginning of a heading or table row, preventing text and
            // rows from being cut between two PDF pages.
            const reportBounds = reportElement.getBoundingClientRect();
            const scaleY = canvas.height / reportBounds.height;
            const breakPoints = Array.from(reportElement.querySelectorAll('h2, tbody tr'))
                .map(element => Math.round((element.getBoundingClientRect().top - reportBounds.top) * scaleY))
                .filter(position => position > 0 && position < canvas.height)
                .sort((first, second) => first - second);

            let sourceY = 0;
            let pageNumber = 1;
            while (sourceY < canvas.height) {
                const maximumEnd = Math.min(sourceY + maximumSliceHeight, canvas.height);
                let sliceEnd = maximumEnd;

                if (maximumEnd < canvas.height) {
                    // Keep enough content on each page while selecting the final safe break
                    // before the physical page boundary.
                    const minimumUsefulEnd = sourceY + Math.floor(maximumSliceHeight * 0.45);
                    const safeBreaks = breakPoints.filter(position =>
                        position >= minimumUsefulEnd && position <= maximumEnd - 8,
                    );
                    if (safeBreaks.length) sliceEnd = safeBreaks[safeBreaks.length - 1];
                }

                if (sliceEnd <= sourceY) sliceEnd = maximumEnd;
                const sourceHeight = sliceEnd - sourceY;
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sourceHeight;
                const context = pageCanvas.getContext('2d');
                if (!context) throw new Error('Unable to create PDF canvas.');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                context.drawImage(
                    canvas,
                    0, sourceY, canvas.width, sourceHeight,
                    0, 0, canvas.width, sourceHeight,
                );

                if (pageNumber > 1) pdf.addPage();
                const renderedHeight = sourceHeight * printableWidth / canvas.width;
                pdf.addImage(
                    pageCanvas.toDataURL('image/jpeg', 0.94),
                    'JPEG', margin, margin, printableWidth, renderedHeight, undefined, 'FAST',
                );
                pdf.setFontSize(7);
                pdf.setTextColor(100, 70, 125);
                pdf.text(`Page ${pageNumber}`, 195, 292, {align: 'right'});
                sourceY = sliceEnd;
                pageNumber++;
            }
            pdf.save(`ape-kade-report-${mode}-${isoDate(now)}.pdf`);
        } finally {
            reportElement.remove();
        }
    }

    function exportCsv() {
        const escapeCsv = (value: unknown) => `"${unicodeText(value).replace(/"/g, '""')}"`;
        const csvLine = (...values: unknown[]) => values.map(escapeCsv).join(',');
        const lines: string[] = [
            // Excel uses this hint to select the delimiter regardless of regional settings.
            'sep=,',
            csvLine('APE KADE CREDIT BOOK'),
            csvLine('Report', title),
            csvLine('Period', periodLabel),
            csvLine('Generated', new Date().toLocaleString()),
            '',
            csvLine('FINANCIAL SUMMARY'),
            csvLine('Total Credit', 'Total Payments', 'Net', 'Credit Count', 'Payment Count'),
            csvLine(report.summary.totalCredit, report.summary.totalPayments, report.summary.net,
                report.summary.creditCount, report.summary.paymentCount),
            '',
            csvLine('CUSTOMER SUMMARY'),
            csvLine('Customer', 'Customer ID', 'Transactions', 'Credit', 'Payments', 'Net'),
            ...exportRows().map((row: any) => csvLine(
                row.Customer, row['Customer ID'], row.Transactions,
                row.Credit, row.Payments, row.Net,
            )),
            '',
            csvLine('CATEGORY DETAILS'),
            csvLine('Category', 'Transactions', 'Total Credit'),
            ...report.categories.map((item: any) => csvLine(item.name, item.count, item.total)),
            '',
            csvLine('DAILY CREDIT AND PAYMENTS'),
            csvLine('Date', 'Credit', 'Payments'),
            ...(report.trend || []).map((item: any) => csvLine(item.date, item.credit, item.payments)),
            '',
            csvLine('MONTHLY CREDIT AND PAYMENTS'),
            csvLine('Month', 'Credit', 'Payments', 'Credit Count', 'Payment Count'),
            ...(report.monthlyTrend || []).map((item: any) => csvLine(
                item.month, item.credit, item.payments, item.creditCount, item.paymentCount,
            )),
            '',
            csvLine('USER ACTIVITY'),
            csvLine('User', 'Transactions', 'Total Amount'),
            ...(report.users || []).map((item: any) => csvLine(item.name, item.count, item.total)),
        ];

        // UTF-8 BOM ensures Sinhala and all Unicode text open correctly in Excel/Windows.
        const csv = `\uFEFF${lines.join('\r\n')}`;
        download(
            new Blob([csv], {type: 'text/csv;charset=utf-8'}),
            `ape-kade-complete-report-${mode}.csv`,
        );
    }

    async function exportExcel() {
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();
        workbook.Props = {
            Title: unicodeText(title),
            Subject: 'Ape Kade financial report',
            Author: 'Ape Kade Credit Book',
            CreatedDate: new Date(),
        };

        const customerRows = exportRows().map((row: any) => [
            unicodeText(row.Customer),
            unicodeText(row['Customer ID']),
            Number(row.Transactions || 0),
            Number(row.Credit || 0),
            Number(row.Payments || 0),
            Number(row.Net || 0),
        ]);
        const categoryRows = report.categories.map((item: any) => [
            unicodeText(item.name), Number(item.count || 0), Number(item.total || 0),
        ]);
        const dailyRows = (report.trend || []).map((item: any) => [
            unicodeText(item.date), Number(item.credit || 0), Number(item.payments || 0),
        ]);
        const monthlyRows = (report.monthlyTrend || []).map((item: any) => [
            unicodeText(item.month), Number(item.credit || 0), Number(item.payments || 0),
            Number(item.creditCount || 0), Number(item.paymentCount || 0),
        ]);
        const userRows = (report.users || []).map((item: any) => [
            unicodeText(item.name), Number(item.count || 0), Number(item.total || 0),
        ]);

        // The first worksheet intentionally contains the complete report so users see
        // all exported details immediately without needing to discover worksheet tabs.
        const fullReportRows: any[][] = [
            ['APE KADE CREDIT BOOK'],
            ['Report', unicodeText(title)],
            ['Period', unicodeText(periodLabel)],
            ['Generated', unicodeText(new Date().toLocaleString())],
            [],
            ['FINANCIAL SUMMARY'],
            ['Total Credit', 'Total Payments', 'Net', 'Credit Count', 'Payment Count'],
            [Number(report.summary.totalCredit || 0), Number(report.summary.totalPayments || 0),
                Number(report.summary.net || 0), Number(report.summary.creditCount || 0),
                Number(report.summary.paymentCount || 0)],
            [],
            ['CUSTOMER SUMMARY'],
            ['Customer', 'Customer ID', 'Transactions', 'Credit', 'Payments', 'Net'],
            ...customerRows,
            [],
            ['CATEGORY DETAILS'],
            ['Category', 'Transactions', 'Total Credit'],
            ...categoryRows,
            [],
            ['DAILY CREDIT AND PAYMENTS'],
            ['Date', 'Credit', 'Payments'],
            ...dailyRows,
            [],
            ['MONTHLY CREDIT AND PAYMENTS'],
            ['Month', 'Credit', 'Payments', 'Credit Count', 'Payment Count'],
            ...monthlyRows,
            [],
            ['USER ACTIVITY'],
            ['User', 'Transactions', 'Total Amount'],
            ...userRows,
        ];
        const fullReportSheet = XLSX.utils.aoa_to_sheet(fullReportRows);
        fullReportSheet['!cols'] = [
            {wch: 34}, {wch: 20}, {wch: 16}, {wch: 17}, {wch: 17}, {wch: 17},
        ];
        fullReportSheet['!merges'] = [
            {s: {r: 0, c: 0}, e: {r: 0, c: 5}},
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet([
            ['APE KADE CREDIT BOOK'],
            ['Report', unicodeText(title)],
            ['Period', unicodeText(periodLabel)],
            [],
            ['Total Credit', 'Total Payments', 'Net', 'Credit Count', 'Payment Count'],
            [Number(report.summary.totalCredit || 0), Number(report.summary.totalPayments || 0),
                Number(report.summary.net || 0), Number(report.summary.creditCount || 0),
                Number(report.summary.paymentCount || 0)],
        ]);
        summarySheet['!cols'] = [
            {wch: 24}, {wch: 28}, {wch: 18}, {wch: 16}, {wch: 18},
        ];

        const customerSheet = XLSX.utils.aoa_to_sheet([
            ['Customer', 'Customer ID', 'Transactions', 'Credit', 'Payments', 'Net'],
            ...customerRows,
        ]);
        customerSheet['!cols'] = [
            {wch: 34}, {wch: 16}, {wch: 14}, {wch: 16}, {wch: 16}, {wch: 16},
        ];
        if (customerRows.length) customerSheet['!autofilter'] = {ref: `A1:F${customerRows.length + 1}`};

        const categorySheet = XLSX.utils.aoa_to_sheet([
            ['Category', 'Transactions', 'Total Credit'],
            ...categoryRows,
        ]);
        categorySheet['!cols'] = [{wch: 32}, {wch: 16}, {wch: 18}];

        const dailySheet = XLSX.utils.aoa_to_sheet([
            ['Date', 'Credit', 'Payments'], ...dailyRows,
        ]);
        dailySheet['!cols'] = [{wch: 16}, {wch: 18}, {wch: 18}];

        const monthlySheet = XLSX.utils.aoa_to_sheet([
            ['Month', 'Credit', 'Payments', 'Credit Count', 'Payment Count'], ...monthlyRows,
        ]);
        monthlySheet['!cols'] = [
            {wch: 14}, {wch: 18}, {wch: 18}, {wch: 16}, {wch: 18},
        ];

        const usersSheet = XLSX.utils.aoa_to_sheet([
            ['User', 'Transactions', 'Total Amount'], ...userRows,
        ]);
        usersSheet['!cols'] = [{wch: 32}, {wch: 16}, {wch: 18}];

        XLSX.utils.book_append_sheet(workbook, fullReportSheet, 'Full Report');
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customers');
        XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
        XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Trend');
        XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Trend');
        XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

        const bytes = XLSX.write(workbook, {
            bookType: 'xlsx', type: 'array', compression: true, cellDates: true,
        });
        download(
            new Blob([bytes], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            `ape-kade-report-${mode}.xlsx`,
        );
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

function unicodeText(value: unknown): string {
    return String(value ?? '').normalize('NFC');
}

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Safari/Edge may still be reading the Blob immediately after click.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}