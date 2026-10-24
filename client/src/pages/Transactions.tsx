import {type FormEvent, useEffect, useState} from 'react';
import {ChevronDown, Edit3, LoaderCircle, Search, ShieldX, SlidersHorizontal, Trash2, X,} from 'lucide-react';
import {api, message} from '../services/api';
import {dateTime, money} from '../utils/format';
import {Empty, PageTitle, Pagination, Spinner, Status} from '../components/UI';
import type {Category, Customer} from '../types';

const emptyFilters = {
    search: '', transactionType: '', status: '', from: '', to: '', customerId: '', categoryId: '',
};

export default function Transactions() {
    const [data, setData] = useState<any>(null);
    const [filters, setFilters] = useState(emptyFilters);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<any>(null);
    const [voiding, setVoiding] = useState<any>(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidBusy, setVoidBusy] = useState(false);
    const [deleting, setDeleting] = useState<any>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const load = () => api.get('/transactions', {params: {...filters, page}})
        .then(response => setData(response.data))
        .catch(requestError => setError(message(requestError)));

    useEffect(() => {
        const timer = setTimeout(load, 250);
        return () => clearTimeout(timer);
    }, [filters, page]);

    useEffect(() => {
        Promise.all([
            api.get('/customers', {params: {limit: 100}}),
            api.get('/categories'),
        ]).then(([customerResponse, categoryResponse]) => {
            setCustomers(customerResponse.data.items);
            setCategories(categoryResponse.data);
        }).catch(requestError => setError(message(requestError)));
    }, []);

    const updateFilter = (key: keyof typeof emptyFilters, value: string) => {
        setFilters(current => ({...current, [key]: value}));
        setPage(1);
    };

    const beginEdit = (transaction: any) => setEditing({
        ...transaction,
        customerId: transaction.customerId?._id,
        categoryId: transaction.categoryId?._id || '',
        createdAt: transaction.createdAt?.slice(0, 16),
        reason: '',
    });

    async function submitVoid(event: FormEvent) {
        event.preventDefault();
        if (!voiding || !voidReason.trim()) return;
        setVoidBusy(true);
        setError('');
        try {
            await api.post(`/transactions/${voiding._id}/void`, {reason: voidReason.trim()});
            setVoiding(null);
            setVoidReason('');
            await load();
        } catch (requestError) {
            setError(message(requestError));
        } finally {
            setVoidBusy(false);
        }
    }

    async function submitDelete(event: FormEvent) {
        event.preventDefault();
        if (!deleting || deleteReason.trim().length < 5) return;
        setDeleteBusy(true);
        setError('');
        try {
            await api.delete(`/transactions/${deleting._id}`, {
                data: {reason: deleteReason.trim()},
            });
            setDeleting(null);
            setDeleteReason('');
            await load();
        } catch (requestError) {
            setError(message(requestError));
        } finally {
            setDeleteBusy(false);
        }
    }

    async function saveEdit(event: FormEvent) {
        event.preventDefault();
        setError('');
        try {
            await api.put(`/transactions/${editing._id}`, {
                ...editing,
                customerId: editing.customerId?._id || editing.customerId,
                categoryId: editing.categoryId?._id || editing.categoryId,
                amount: Number(editing.amount),
                reason: editing.reason,
            });
            setEditing(null);
            await load();
        } catch (requestError) {
            setError(message(requestError));
        }
    }

    return <>
        <PageTitle
            title="ගනුදෙනු ඉතිහාසය"
            subtitle="Search, filter, edit, change type, void or permanently delete transactions"
        />

        <section className="card min-w-0 overflow-hidden">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <label className="min-w-0 sm:col-span-2 xl:col-span-4">
                    <span className="label">Search transactions</span>
                    <span className="relative block min-w-0">
            <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
            <input
                className="input min-w-0 pl-10"
                placeholder="ID, description or reference…"
                value={filters.search}
                onChange={event => updateFilter('search', event.target.value)}
            />
          </span>
                </label>

                <button
                    type="button"
                    className="btn-secondary w-full justify-between sm:col-span-2 sm:hidden"
                    onClick={() => setFiltersOpen(value => !value)}
                    aria-expanded={filtersOpen}
                >
                    <span className="flex items-center gap-2"><SlidersHorizontal size={18}/>Filters</span>
                    <ChevronDown size={18} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`}/>
                </button>

                <div
                    className={`${filtersOpen ? 'grid' : 'hidden'} min-w-0 grid-cols-1 gap-3 sm:col-span-2 sm:grid sm:grid-cols-2 xl:contents`}>
                    <FilterSelect label="Transaction type" value={filters.transactionType}
                                  onChange={(value: string) => updateFilter('transactionType', value)}
                                  className="xl:col-span-2">
                        <option value="">All types</option>
                        <option>CREDIT</option>
                        <option>PAYMENT</option>
                        <option>ADJUSTMENT</option>
                    </FilterSelect>
                    <FilterSelect label="Status" value={filters.status}
                                  onChange={(value: string) => updateFilter('status', value)} className="xl:col-span-2">
                        <option value="">All statuses</option>
                        <option>ACTIVE</option>
                        <option>VOID</option>
                        <option>CORRECTED</option>
                    </FilterSelect>
                    <FilterInput label="From date" type="date" value={filters.from}
                                 onChange={(value: string) => updateFilter('from', value)} className="xl:col-span-2"/>
                    <FilterInput label="To date" type="date" value={filters.to}
                                 onChange={(value: string) => updateFilter('to', value)} className="xl:col-span-2"/>
                    <FilterSelect label="Customer" value={filters.customerId}
                                  onChange={(value: string) => updateFilter('customerId', value)}
                                  className="sm:col-span-2 xl:col-span-5">
                        <option value="">All customers</option>
                        {customers.map(customer => <option key={customer._id}
                                                           value={customer._id}>{customer.name} ({customer.customerCode})</option>)}
                    </FilterSelect>
                    <FilterSelect label="Category" value={filters.categoryId}
                                  onChange={(value: string) => updateFilter('categoryId', value)}
                                  className="sm:col-span-2 xl:col-span-5">
                        <option value="">All categories</option>
                        {categories.map(category => <option key={category._id}
                                                            value={category._id}>{category.name}</option>)}
                    </FilterSelect>
                    <div className="flex items-end sm:col-span-2 xl:col-span-2">
                        <button type="button" className="btn-secondary w-full" onClick={() => {
                            setFilters(emptyFilters);
                            setPage(1);
                        }}>
                            Clear filters
                        </button>
                    </div>
                </div>
            </div>

            {error && <p className="mt-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-5">
                {!data ? <Spinner/> : !data.items.length
                    ? <Empty title="No transactions found." body="Change the filters or record a transaction."/>
                    : <>
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
                                <tbody>{data.items.map((transaction: any) => <TransactionRow
                                    key={transaction._id}
                                    transaction={transaction}
                                    edit={() => beginEdit(transaction)}
                                    voidTx={() => {
                                        setVoiding(transaction);
                                        setVoidReason('');
                                    }}
                                    deleteTx={() => {
                                        setDeleting(transaction);
                                        setDeleteReason('');
                                    }}
                                />)}</tbody>
                            </table>
                        </div>

                        <div className="grid min-w-0 gap-3 xl:hidden">
                            {data.items.map((transaction: any) => <MobileTransactionCard
                                key={transaction._id}
                                transaction={transaction}
                                edit={() => beginEdit(transaction)}
                                voidTx={() => {
                                    setVoiding(transaction);
                                    setVoidReason('');
                                }}
                                deleteTx={() => {
                                    setDeleting(transaction);
                                    setDeleteReason('');
                                }}
                            />)}
                        </div>
                        <Pagination page={data.page} pages={data.pages} onChange={setPage}/>
                    </>}
            </div>
        </section>

        {voiding && <ActionModal title="Void transaction"
                                 subtitle={`${voiding.transactionCode} · ${voiding.customerId?.name || ''}`}
                                 icon={<ShieldX/>} close={() => setVoiding(null)} disabled={voidBusy}>
            <form onSubmit={submitVoid}>
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">The original transaction remains in
                    permanent history but is excluded from active balances.
                </div>
                <label className="mt-5 block"><span className="label">Void reason *</span><textarea
                    className="input min-h-28" autoFocus required value={voidReason}
                    onChange={event => setVoidReason(event.target.value)}/></label>
                <ModalActions close={() => setVoiding(null)} busy={voidBusy} disabled={!voidReason.trim()}
                              submitLabel="Void transaction" icon={<ShieldX size={17}/>} tone="amber"/>
            </form>
        </ActionModal>}

        {deleting && <ActionModal title="Delete transaction"
                                  subtitle={`${deleting.transactionCode} · ${deleting.customerId?.name || ''}`}
                                  icon={<Trash2/>} close={() => setDeleting(null)} disabled={deleteBusy} danger>
            <form onSubmit={submitDelete}>
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">This permanently removes the transaction
                    and cannot be undone.
                </div>
                <label className="mt-5 block"><span className="label">Deletion reason *</span><textarea
                    className="input min-h-28" autoFocus required minLength={5} value={deleteReason}
                    onChange={event => setDeleteReason(event.target.value)}/></label>
                <ModalActions close={() => setDeleting(null)} busy={deleteBusy}
                              disabled={deleteReason.trim().length < 5} submitLabel="Delete permanently"
                              icon={<Trash2 size={17}/>} tone="red"/>
            </form>
        </ActionModal>}

        {editing &&
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
                <form onSubmit={saveEdit}
                      className="max-h-[100dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[95vh] sm:rounded-3xl sm:p-6">
                    <div className="mb-5 flex min-w-0 items-start gap-3">
                        <div className="min-w-0"><h2 className="text-xl font-extrabold">Edit transaction</h2><p
                            className="break-all text-sm text-slate-500">{editing.transactionCode}</p></div>
                        <button type="button" className="ml-auto shrink-0 rounded-lg p-2"
                                onClick={() => setEditing(null)}><X/></button>
                    </div>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <FilterSelect label="Customer / Name *" value={editing.customerId}
                                      onChange={(value: string) => setEditing({
                                          ...editing,
                                          customerId: value
                                      })}>{customers.map(customer => <option key={customer._id}
                                                                             value={customer._id}>{customer.name} ({customer.customerCode})</option>)}</FilterSelect>
                        <FilterSelect label="Transaction Type *" value={editing.transactionType}
                                      onChange={(value: string) => setEditing({...editing, transactionType: value})}>
                            <option>CREDIT</option>
                            <option>PAYMENT</option>
                        </FilterSelect>
                        <FilterInput label="Amount *" type="number" value={editing.amount}
                                     onChange={(value: string) => setEditing({...editing, amount: value})}/>
                        <FilterInput label="Date and Time *" type="datetime-local" value={editing.createdAt}
                                     onChange={(value: string) => setEditing({...editing, createdAt: value})}/>
                        {editing.transactionType === 'CREDIT' &&
                            <FilterSelect label="Category *" value={editing.categoryId}
                                          onChange={(value: string) => setEditing({...editing, categoryId: value})}>
                                <option value="">Select</option>
                                {categories.map(category => <option key={category._id}
                                                                    value={category._id}>{category.name}</option>)}
                            </FilterSelect>}
                        {editing.transactionType === 'PAYMENT' &&
                            <FilterSelect label="Payment Method *" value={editing.paymentMethod || 'Cash'}
                                          onChange={(value: string) => setEditing({...editing, paymentMethod: value})}>
                                <option>Cash</option>
                                <option>Bank Transfer</option>
                                <option>Other</option>
                            </FilterSelect>}
                        <FilterInput label="Reference Number" value={editing.referenceNumber || ''}
                                     onChange={(value: string) => setEditing({...editing, referenceNumber: value})}/>
                    </div>
                    <label className="mt-4 block"><span className="label">Description</span><input className="input"
                                                                                                   value={editing.description || ''}
                                                                                                   onChange={event => setEditing({
                                                                                                       ...editing,
                                                                                                       description: event.target.value
                                                                                                   })}/></label>
                    <label className="mt-4 block"><span className="label">Reason for change <span
                        className="font-normal text-slate-400">(optional)</span></span><textarea
                        className="input min-h-20" value={editing.reason}
                        onChange={event => setEditing({...editing, reason: event.target.value})}/></label>
                    <div
                        className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t bg-white px-4 pb-[max(.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:p-0">
                        <button type="button" className="btn-secondary flex-1 sm:flex-none"
                                onClick={() => setEditing(null)}>Cancel
                        </button>
                        <button className="btn-primary flex-1 sm:flex-none">Save changes</button>
                    </div>
                </form>
            </div>}
    </>;
}

function MobileTransactionCard({transaction, edit, voidTx, deleteTx}: any) {
    const editable = ['CREDIT', 'PAYMENT'].includes(transaction.transactionType);
    return <article
        className="min-w-0 overflow-hidden rounded-2xl border border-pastel_mauve_6-700 bg-white shadow-sm dark:border-indigo_ink-400 dark:bg-deep_amethyst-500">
        <div
            className="flex min-w-0 items-start justify-between gap-3 border-b border-pastel_mauve_6-700 p-4 dark:border-indigo_ink-400">
            <div className="min-w-0"><b
                className="block truncate">{transaction.customerId?.name || 'Unknown customer'}</b><small
                className="block break-all text-slate-500">{transaction.transactionCode}</small></div>
            <Status value={transaction.status}/>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
            <Detail label="Type" value={transaction.transactionType}/>
            <Detail label="Amount" value={money(transaction.amount)} strong/>
            <Detail label="Category / Method" value={transaction.categoryId?.name || transaction.paymentMethod || '—'}/>
            <Detail label="Date" value={dateTime(transaction.createdAt)}/>
            <Detail label="Customer ID" value={transaction.customerId?.customerCode || '—'}/>
            <Detail label="Recorded By" value={transaction.createdBy?.fullName || '—'}/>
        </div>
        {(transaction.description || transaction.referenceNumber) &&
            <div className="mx-4 mb-4 rounded-xl bg-pink_orchid-900 p-3 text-sm dark:bg-indigo_ink-300"><p
                className="break-words">{transaction.description || transaction.referenceNumber}</p></div>}
        {transaction.status === 'ACTIVE' && <div
            className={`grid gap-2 border-t border-pastel_mauve_6-700 p-3 dark:border-indigo_ink-400 ${editable ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {editable &&
                <button className="btn-secondary min-w-0 px-2" onClick={edit}><Edit3 size={16}/><span>Edit</span>
                </button>}
            <button className="btn-secondary min-w-0 px-2 text-amber-600" onClick={voidTx}><ShieldX
                size={16}/><span>Void</span></button>
            <button className="btn-secondary min-w-0 px-2 text-red-600" onClick={deleteTx}><Trash2
                size={16}/><span>Delete</span></button>
        </div>}
    </article>;
}

function TransactionRow({transaction, edit, voidTx, deleteTx}: any) {
    return <tr>
        <td className="td"><b>{transaction.transactionCode}</b><small
            className="block text-slate-500">{dateTime(transaction.createdAt)}</small></td>
        <td className="td"><b>{transaction.customerId?.name}</b><small
            className="block text-slate-500">{transaction.customerId?.customerCode}</small></td>
        <td className="td">{transaction.transactionType}</td>
        <td className="td">{transaction.categoryId?.name || transaction.paymentMethod || '—'}<small
            className="block text-slate-500">{transaction.referenceNumber}</small></td>
        <td className="td font-bold">{money(transaction.amount)}</td>
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

function Detail({label, value, strong = false}: { label: string; value: string; strong?: boolean }) {
    return <div className="min-w-0"><span
        className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span><span
        className={`mt-1 block break-words ${strong ? 'font-extrabold' : ''}`}>{value}</span></div>;
}

function FilterSelect({label, value, onChange, children, className = ''}: any) {
    return <label className={`min-w-0 ${className}`}><span className="label">{label}</span><select
        className="input min-w-0" value={value}
        onChange={event => onChange(event.target.value)}>{children}</select></label>;
}

function FilterInput({label, value, onChange, type = 'text', className = ''}: any) {
    return <label className={`min-w-0 ${className}`}><span className="label">{label}</span><input
        className="input min-w-0" type={type} min={type === 'number' ? '0.01' : undefined}
        step={type === 'number' ? '0.01' : undefined} required={label.includes('*')} value={value}
        onChange={event => onChange(event.target.value)}/></label>;
}

function ActionModal({title, subtitle, icon, close, disabled, danger = false, children}: any) {
    return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
        <div
            className="max-h-[100dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[95vh] sm:rounded-3xl sm:p-6">
            <div className="flex min-w-0 items-start gap-3">
                <div
                    className={`shrink-0 rounded-xl p-3 ${danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{icon}</div>
                <div className="min-w-0"><h2 className="text-xl font-extrabold">{title}</h2><p
                    className="break-all text-sm text-slate-500">{subtitle}</p></div>
                <button type="button" className="ml-auto shrink-0 rounded-lg p-2" onClick={close} disabled={disabled}>
                    <X/></button>
            </div>
            {children}</div>
    </div>;
}

function ModalActions({close, busy, disabled, submitLabel, icon, tone}: any) {
    return <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
        <button
            className={`btn text-white ${tone === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
            disabled={busy || disabled}>{busy ?
            <LoaderCircle size={17} className="animate-spin"/> : icon}{busy ? 'Please wait…' : submitLabel}</button>
    </div>;
}