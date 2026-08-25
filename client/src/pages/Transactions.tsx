import {useEffect, useState} from 'react';
import {Search, ShieldX} from 'lucide-react';
import {api, message} from '../services/api';
import {useAuth} from '../contexts/AuthContext';
import {money, dateTime} from '../utils/format';
import {Empty, PageTitle, Pagination, Spinner, Status} from '../components/UI';

export default function Transactions() {
    const {user} = useAuth(), [data, setData] = useState<any>(null), [filters, setFilters] = useState({
        search: '',
        transactionType: '',
        status: '',
        from: '',
        to: ''
    }), [page, setPage] = useState(1), [error, setError] = useState('');
    const load = () => api.get('/transactions', {params: {...filters, page}}).then(r => setData(r.data));
    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t)
    }, [filters, page]);

    async function voidTx(id: string) {
        const reason = prompt('Void reason (required):');
        if (!reason) return;
        try {
            await api.post(`/transactions/${id}/void`, {reason});
            load()
        } catch (e) {
            setError(message(e))
        }
    }

    return <><PageTitle title="ගනුදෙනු ඉතිහාසය" subtitle="Permanent and auditable financial records"/>
        <div className="card">
            <div className="mb-5 grid gap-3 md:grid-cols-5">
                <div className="relative md:col-span-2"><Search size={18}
                                                                className="absolute left-3 top-3 text-slate-400"/><input
                    className="input pl-10" placeholder="Transaction ID, description…" value={filters.search}
                    onChange={e => setFilters({...filters, search: e.target.value})}/></div>
                <select className="input" value={filters.transactionType}
                        onChange={e => setFilters({...filters, transactionType: e.target.value})}>
                    <option value="">All types</option>
                    <option>CREDIT</option>
                    <option>PAYMENT</option>
                    <option>ADJUSTMENT</option>
                </select><select className="input" value={filters.status}
                                 onChange={e => setFilters({...filters, status: e.target.value})}>
                <option value="">All statuses</option>
                <option>ACTIVE</option>
                <option>VOID</option>
                <option>CORRECTED</option>
            </select><input className="input" type="date" value={filters.from}
                            onChange={e => setFilters({...filters, from: e.target.value})}/></div>
            {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{!data ?
            <Spinner/> : !data.items.length ?
                <Empty title="No transactions found." body="Credit and payment transactions will appear here."/> : <>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px]">
                            <thead>
                            <tr>
                                <th className="th">Transaction</th>
                                <th className="th">Customer</th>
                                <th className="th">Type</th>
                                <th className="th">Category / Method</th>
                                <th className="th">Amount</th>
                                <th className="th">Created By</th>
                                <th className="th">Status</th>
                                <th className="th"></th>
                            </tr>
                            </thead>
                            <tbody>{data.items.map((t: any) => <tr key={t._id}>
                                <td className="td"><b>{t.transactionCode}</b><small
                                    className="block text-slate-500">{dateTime(t.createdAt)}</small></td>
                                <td className="td"><b>{t.customerId?.name}</b><small
                                    className="block text-slate-500">{t.customerId?.customerCode}</small></td>
                                <td className="td">{t.transactionType}</td>
                                <td className="td">{t.categoryId?.name || t.paymentMethod || '—'}<small
                                    className="block text-slate-500">{t.referenceNumber}</small></td>
                                <td className={`td font-bold ${t.transactionType === 'PAYMENT' ? 'text-emerald-600' : 'text-rose-600'}`}>{money(t.amount)}</td>
                                <td className="td">{t.createdBy?.fullName}</td>
                                <td className="td"><Status value={t.status}/></td>
                                <td className="td">{user.role === 'ADMIN' && t.status === 'ACTIVE' &&
                                    <button title="Void" className="btn-secondary text-red-600"
                                            onClick={() => voidTx(t._id)}><ShieldX size={17}/></button>}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                    <Pagination page={data.page} pages={data.pages} onChange={setPage}/></>}</div>
    </>
}
