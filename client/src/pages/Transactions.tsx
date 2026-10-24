import {useEffect, useState} from 'react';
import {Edit3, Search, ShieldX, Trash2, X} from 'lucide-react';
import {api, message} from '../services/api';
import {dateTime, money} from '../utils/format';
import {Empty, PageTitle, Pagination, Spinner, Status} from '../components/UI';
import type {Category, Customer} from '../types';

export default function Transactions() {
    const [data, setData] = useState<any>(null);
    const [filters, setFilters] = useState({
        search: '',
        transactionType: '',
        status: '',
        from: '',
        to: '',
        customerId: '',
        categoryId: ''
    });
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<any>(null);
    const [voiding, setVoiding] = useState<any>(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidBusy, setVoidBusy] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const load = () => api.get('/transactions', {params: {...filters, page}}).then(response => setData(response.data));

    useEffect(() => {
        const timer = setTimeout(load, 250);
        return () => clearTimeout(timer);
    }, [filters, page]);
    useEffect(() => {
        Promise.all([api.get('/customers', {params: {limit: 100}}), api.get('/categories')])
            .then(([customerResponse, categoryResponse]) => {
                setCustomers(customerResponse.data.items);
                setCategories(categoryResponse.data);
            });
    }, []);

    async function submitVoid(event: React.FormEvent) {
        event.preventDefault();
        if (!voiding || !voidReason.trim()) return;
        setVoidBusy(true);
        setError('');
        try {
            await api.post(`/transactions/${voiding._id}/void`, {reason: voidReason.trim()});
            setVoiding(null);
            setVoidReason('');
            load();
        } catch (err) {
            setError(message(err));
        } finally {
            setVoidBusy(false);
        }
    }

    async function deleteTransaction(transaction: any) {
        const reason = prompt(`Permanently delete ${transaction.transactionCode}? Enter a reason:`);
        if (!reason) return;
        if (!confirm('This permanently removes the transaction. Continue?')) return;
        try {
            await api.delete(`/transactions/${transaction._id}`, {data: {reason}});
            load();
        } catch (err) {
            setError(message(err));
        }
    }

    async function saveEdit(event: React.FormEvent) {
        event.preventDefault();
        try {
            await api.put(`/transactions/${editing._id}`, {
                ...editing,
                customerId: editing.customerId?._id || editing.customerId,
                categoryId: editing.categoryId?._id || editing.categoryId,
                amount: Number(editing.amount),
                reason: editing.reason
            });
            setEditing(null);
            load();
        } catch (err) {
            setError(message(err));
        }
    }

    const updateFilter = (key: string, value: string) => {
        setFilters(current => ({...current, [key]: value}));
        setPage(1);
    };

    return <><PageTitle title="ගනුදෙනු ඉතිහාසය"
                        subtitle="Search, filter, edit, change type, void or permanently delete transactions"/>
        <div className="card">
            <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <label className="min-w-0 sm:col-span-2 xl:col-span-4">
                    <span className="label">Search transactions</span>
                    <span className="relative block"><Search size={18}
                                                             className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/><input
                        className="input min-w-0 pl-10" placeholder="ID, description or reference…"
                        value={filters.search} onChange={event => updateFilter('search', event.target.value)}/></span>
                </label>
                <label className="min-w-0 xl:col-span-2"><span className="label">Transaction type</span><select
                    className="input min-w-0" value={filters.transactionType}
                    onChange={event => updateFilter('transactionType', event.target.value)}>
                    <option value="">All types</option>
                    <option>CREDIT</option>
                    <option>PAYMENT</option>
                    <option>ADJUSTMENT</option>
                </select></label>
                <label className="min-w-0 xl:col-span-2"><span className="label">Status</span><select
                    className="input min-w-0" value={filters.status}
                    onChange={event => updateFilter('status', event.target.value)}>
                    <option value="">All statuses</option>
                    <option>ACTIVE</option>
                    <option>VOID</option>
                    <option>CORRECTED</option>
                </select></label>
                <label className="min-w-0 xl:col-span-2"><span className="label">From date</span><input
                    className="input min-w-0" type="date" value={filters.from}
                    onChange={event => updateFilter('from', event.target.value)}/></label>
                <label className="min-w-0 xl:col-span-2"><span className="label">To date</span><input
                    className="input min-w-0" type="date" value={filters.to}
                    onChange={event => updateFilter('to', event.target.value)}/></label>
                <label className="min-w-0 sm:col-span-2 xl:col-span-5"><span className="label">Customer</span><select
                    className="input min-w-0" value={filters.customerId}
                    onChange={event => updateFilter('customerId', event.target.value)}>
                    <option value="">All customers</option>
                    {customers.map(customer => <option key={customer._id}
                                                       value={customer._id}>{customer.name} ({customer.customerCode})</option>)}
                </select></label>
                <label className="min-w-0 sm:col-span-2 xl:col-span-5"><span className="label">Category</span><select
                    className="input min-w-0" value={filters.categoryId}
                    onChange={event => updateFilter('categoryId', event.target.value)}>
                    <option value="">All categories</option>
                    {categories.map(category => <option key={category._id}
                                                        value={category._id}>{category.name}</option>)}</select></label>
                <div className="flex items-end sm:col-span-2 xl:col-span-2">
                    <button className="btn-secondary w-full" onClick={() => {
                        setFilters({
                            search: '',
                            transactionType: '',
                            status: '',
                            from: '',
                            to: '',
                            customerId: '',
                            categoryId: ''
                        });
                        setPage(1);
                    }}>Clear filters
                    </button>
                </div>
            </div>
            {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {!data ? <Spinner/> : !data.items.length ?
                <Empty title="No transactions found." body="Change the filters or record a transaction."/> : <>
                    <div className="hidden overflow-x-auto xl:block">
                        <table className="w-full min-w-[1100px]">
                            <thead>
                            <tr>
                                <th className="th">Transaction</th>
                                <th className="th">Customer</th>
                                <th className="th">Type</th>
                                <th className="th">Category / Method</th>
                                <th className="th">Amount</th>
                                <th className="th">Created By</th>
                                <th className="th">Status</th>
                                <th className="th">Actions</th>
                            </tr>
                            </thead>
                            <tbody>{data.items.map((transaction: any) => <TransactionRow key={transaction._id}
                                                                                         transaction={transaction}
                                                                                         edit={() => setEditing({
                                                                                             ...transaction,
                                                                                             customerId: transaction.customerId?._id,
                                                                                             categoryId: transaction.categoryId?._id || '',
                                                                                             createdAt: transaction.createdAt?.slice(0, 16),
                                                                                             reason: ''
                                                                                         })} voidTx={() => {
                                setVoiding(transaction);
                                setVoidReason('');
                            }} deleteTx={() => deleteTransaction(transaction)}/>)}</tbody>
                        </table>
                    </div>
                    <div className="space-y-3 xl:hidden">{data.items.map((transaction: any) => <div
                        className="rounded-2xl border border-slate-200 p-4" key={transaction._id}>
                        <div className="flex justify-between gap-3">
                            <div><b>{transaction.customerId?.name}</b><small
                                className="block text-slate-500">{transaction.transactionCode}</small></div>
                            <Status value={transaction.status}/></div>
                        <div className="mt-3 flex justify-between"><span
                            className="text-sm">{transaction.transactionType} · {transaction.categoryId?.name || transaction.paymentMethod || '-'}</span><b>{money(transaction.amount)}</b>
                        </div>
                        <small
                            className="mt-2 block text-slate-500">{dateTime(transaction.createdAt)}</small>{transaction.status === 'ACTIVE' &&
                        <div className="mt-3 flex gap-2">{['CREDIT', 'PAYMENT'].includes(transaction.transactionType) &&
                            <button className="btn-secondary flex-1" onClick={() => setEditing({
                                ...transaction,
                                customerId: transaction.customerId?._id,
                                categoryId: transaction.categoryId?._id || '',
                                createdAt: transaction.createdAt?.slice(0, 16),
                                reason: ''
                            })}><Edit3 size={16}/>Edit</button>}
                            <button className="btn-secondary text-amber-600" onClick={() => {
                                setVoiding(transaction);
                                setVoidReason('');
                            }}><ShieldX size={16}/></button>
                            <button className="btn-secondary text-red-600"
                                    onClick={() => deleteTransaction(transaction)}><Trash2 size={16}/></button>
                        </div>}</div>)}</div>
                    <Pagination page={data.page} pages={data.pages} onChange={setPage}/>
                </>}
        </div>

        {voiding &&
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
                <form onSubmit={submitVoid} className="w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><ShieldX/></div>
                        <div><h2 className="text-xl font-extrabold">Void transaction</h2><p
                            className="text-sm text-slate-500">{voiding.transactionCode} · {voiding.customerId?.name}</p>
                        </div>
                        <button type="button" className="ml-auto" onClick={() => setVoiding(null)} disabled={voidBusy}>
                            <X/></button>
                    </div>
                    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">The original transaction
                        will remain in permanent history, but it will be excluded from active balance calculations.
                    </div>
                    <label className="mt-5 block"><span className="label">Void reason *</span><textarea
                        className="input min-h-28" autoFocus required value={voidReason}
                        onChange={event => setVoidReason(event.target.value)}
                        placeholder="Explain why this transaction must be voided"/></label>
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" className="btn-secondary" onClick={() => setVoiding(null)}
                                disabled={voidBusy}>Cancel
                        </button>
                        <button className="btn bg-amber-500 text-white hover:bg-amber-600"
                                disabled={voidBusy || !voidReason.trim()}><ShieldX
                            size={17}/>{voidBusy ? 'Voiding…' : 'Void transaction'}</button>
                    </div>
                </form>
            </div>}

        {editing &&
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
                <form onSubmit={saveEdit}
                      className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
                    <div className="mb-5 flex">
                        <div><h2 className="text-xl font-extrabold">Edit transaction</h2><p
                            className="text-sm text-slate-500">{editing.transactionCode}</p></div>
                        <button type="button" className="ml-auto" onClick={() => setEditing(null)}><X/></button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label><span className="label">Customer / Name *</span><select className="input"
                                                                                       value={editing.customerId}
                                                                                       onChange={event => setEditing({
                                                                                           ...editing,
                                                                                           customerId: event.target.value
                                                                                       })}>{customers.map(customer =>
                            <option key={customer._id}
                                    value={customer._id}>{customer.name} ({customer.customerCode})</option>)}</select></label>
                        <label><span className="label">Transaction Type *</span><select className="input"
                                                                                        value={editing.transactionType}
                                                                                        onChange={event => setEditing({
                                                                                            ...editing,
                                                                                            transactionType: event.target.value
                                                                                        })}>
                            <option>CREDIT</option>
                            <option>PAYMENT</option>
                        </select></label>
                        <label><span className="label">Amount *</span><input className="input" type="number" min="0.01"
                                                                             step="0.01" value={editing.amount}
                                                                             onChange={event => setEditing({
                                                                                 ...editing,
                                                                                 amount: event.target.value
                                                                             })} required/></label>
                        <label><span className="label">Date and Time *</span><input className="input"
                                                                                    type="datetime-local"
                                                                                    value={editing.createdAt}
                                                                                    onChange={event => setEditing({
                                                                                        ...editing,
                                                                                        createdAt: event.target.value
                                                                                    })} required/></label>
                        {editing.transactionType === 'CREDIT' &&
                            <label><span className="label">Category *</span><select className="input"
                                                                                    value={editing.categoryId}
                                                                                    onChange={event => setEditing({
                                                                                        ...editing,
                                                                                        categoryId: event.target.value
                                                                                    })} required>
                                <option value="">Select</option>
                                {categories.map(category => <option key={category._id}
                                                                    value={category._id}>{category.name}</option>)}
                            </select></label>}
                        {editing.transactionType === 'PAYMENT' &&
                            <label><span className="label">Payment Method *</span><select className="input"
                                                                                          value={editing.paymentMethod || 'Cash'}
                                                                                          onChange={event => setEditing({
                                                                                              ...editing,
                                                                                              paymentMethod: event.target.value
                                                                                          })}>
                                <option>Cash</option>
                                <option>Bank Transfer</option>
                                <option>Other</option>
                            </select></label>}
                        <label><span className="label">Reference Number</span><input className="input"
                                                                                     value={editing.referenceNumber || ''}
                                                                                     onChange={event => setEditing({
                                                                                         ...editing,
                                                                                         referenceNumber: event.target.value
                                                                                     })}/></label>
                    </div>
                    <label className="mt-4 block"><span className="label">Description</span><input className="input"
                                                                                                   value={editing.description || ''}
                                                                                                   onChange={event => setEditing({
                                                                                                       ...editing,
                                                                                                       description: event.target.value
                                                                                                   })}/></label><label
                    className="mt-4 block"><span className="label">Reason for change <span
                    className="font-normal text-slate-400">(optional)</span></span><textarea className="input"
                                                                                             value={editing.reason}
                                                                                             onChange={event => setEditing({
                                                                                                 ...editing,
                                                                                                 reason: event.target.value
                                                                                             })}/></label>
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                        <button className="btn-primary">Save changes</button>
                    </div>
                </form>
            </div>}
    </>;
}

function TransactionRow({transaction, edit, voidTx, deleteTx}: any) {
    return <tr>
        <td className="td"><b>{transaction.transactionCode}</b><small
            className="block text-slate-500">{dateTime(transaction.createdAt)}</small></td>
        <td className="td"><b>{transaction.customerId?.name}</b><small
            className="block text-slate-500">{transaction.customerId?.customerCode}</small></td>
        <td className="td">{transaction.transactionType}</td>
        <td className="td">{transaction.categoryId?.name || transaction.paymentMethod || '-'}<small
            className="block text-slate-500">{transaction.referenceNumber}</small></td>
        <td className={`td font-bold ${transaction.transactionType === 'PAYMENT' ? 'text-deep_lilac-500 dark:text-lavender_purple-600' : 'text-rose-600'}`}>{money(transaction.amount)}</td>
        <td className="td">{transaction.createdBy?.fullName}</td>
        <td className="td"><Status value={transaction.status}/></td>
        <td className="td">{transaction.status === 'ACTIVE' &&
            <div className="flex gap-2">{['CREDIT', 'PAYMENT'].includes(transaction.transactionType) &&
                <button className="btn-secondary" title="Edit" onClick={edit}><Edit3 size={16}/></button>}
                <button className="btn-secondary text-amber-600" title="Void" onClick={voidTx}><ShieldX size={16}/>
                </button>
                <button className="btn-secondary text-red-600" title="Delete" onClick={deleteTx}><Trash2 size={16}/>
                </button>
            </div>}</td>
    </tr>;
}