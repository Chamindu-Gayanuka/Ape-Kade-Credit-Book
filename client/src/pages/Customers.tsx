import {type FormEvent, useEffect, useState} from 'react';
import {Edit3, Eye, LoaderCircle, MapPin, Phone, Plus, Search, X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {api, message} from '../services/api';
import type {Customer} from '../types';
import {dateTime, money} from '../utils/format';
import {Empty, PageTitle, Pagination, Spinner, Status} from '../components/UI';

const emptyCustomer = {
    name: '', phone: '', nic: '', address: '', notes: '', status: 'ACTIVE',
};

export default function Customers() {
    const [data, setData] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<any>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = () => api.get('/customers', {params: {search, page}})
        .then(response => setData(response.data))
        .catch(requestError => setError(message(requestError)));

    useEffect(() => {
        const timer = setTimeout(load, 300);
        return () => clearTimeout(timer);
    }, [search, page]);

    async function save(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editing._id) await api.put(`/customers/${editing._id}`, editing);
            else await api.post('/customers', editing);
            setEditing(null);
            await load();
        } catch (requestError) {
            setError(message(requestError));
        } finally {
            setSaving(false);
        }
    }

    const openNewCustomer = () => {
        setError('');
        setEditing({...emptyCustomer});
    };

    return <>
        <PageTitle
            title="ගනුදෙනුකරුවන්"
            subtitle="Customers and outstanding balances"
            action={<button className="btn-primary w-full sm:w-auto" onClick={openNewCustomer}>
                <Plus size={18}/>Add customer
            </button>}
        />

        <section className="card min-w-0 overflow-hidden">
            <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={19}/>
                <input
                    className="input min-w-0 pl-10"
                    placeholder="Search name, phone, ID or NIC…"
                    value={search}
                    onChange={event => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                />
            </div>

            {error && !editing && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
            </div>}

            <div className="mt-5">
                {!data ? <Spinner/> : !data.items.length
                    ? <Empty
                        title="No customers found."
                        body="Add your first customer to begin managing credit."
                        action={<button className="btn-primary" onClick={openNewCustomer}>Add customer</button>}
                    />
                    : <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[850px]">
                                <thead>
                                <tr>
                                    <th className="th">Customer</th>
                                    <th className="th">Balance</th>
                                    <th className="th">Phone / NIC</th>
                                    <th className="th">Registered</th>
                                    <th className="th">Status</th>
                                    <th className="th">Actions</th>
                                </tr>
                                </thead>
                                <tbody>{data.items.map((customer: Customer) => <CustomerRow
                                    key={customer._id}
                                    customer={customer}
                                    edit={() => {
                                        setError('');
                                        setEditing({...customer});
                                    }}
                                />)}</tbody>
                            </table>
                        </div>

                        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:hidden">
                            {data.items.map((customer: Customer) => <CustomerCard
                                key={customer._id}
                                customer={customer}
                                edit={() => {
                                    setError('');
                                    setEditing({...customer});
                                }}
                            />)}
                        </div>

                        <Pagination page={data.page} pages={data.pages} onChange={setPage}/>
                    </>}
            </div>
        </section>

        {editing &&
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4">
                <form
                    onSubmit={save}
                    className="max-h-[100dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[95vh] sm:rounded-3xl sm:p-6"
                >
                    <div className="mb-5 flex min-w-0 items-start gap-3">
                        <div className="min-w-0">
                            <h2 className="text-xl font-extrabold">{editing._id ? 'Edit customer' : 'New customer'}</h2>
                            <p className="text-sm text-slate-500">සත්‍ය ගනුදෙනුකරුගේ තොරතුරු</p>
                        </div>
                        <button type="button" className="ml-auto shrink-0 rounded-lg p-2"
                                onClick={() => setEditing(null)} disabled={saving}>
                            <X/>
                        </button>
                    </div>

                    {error && <p className="mb-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Customer Name *" value={editing.name}
                               onChange={name => setEditing({...editing, name})} required/>
                        <Field label="Phone Number" value={editing.phone}
                               onChange={phone => setEditing({...editing, phone})} inputMode="tel"/>
                        <Field label="NIC / ID" value={editing.nic} onChange={nic => setEditing({...editing, nic})}/>
                        {editing._id && <label className="min-w-0">
                            <span className="label">Status</span>
                            <select className="input min-w-0" value={editing.status}
                                    onChange={event => setEditing({...editing, status: event.target.value})}>
                                <option>ACTIVE</option>
                                <option>INACTIVE</option>
                            </select>
                        </label>}
                    </div>

                    <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                        <label className="min-w-0"><span className="label">Address</span><textarea
                            className="input min-h-28" value={editing.address || ''}
                            onChange={event => setEditing({...editing, address: event.target.value})}/></label>
                        <label className="min-w-0"><span className="label">Notes</span><textarea
                            className="input min-h-28" value={editing.notes || ''}
                            onChange={event => setEditing({...editing, notes: event.target.value})}/></label>
                    </div>

                    <div
                        className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t bg-white px-4 pb-[max(.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:p-0">
                        <button type="button" className="btn-secondary flex-1 sm:flex-none"
                                onClick={() => setEditing(null)} disabled={saving}>Cancel
                        </button>
                        <button className="btn-primary flex-1 sm:flex-none" disabled={saving}>
                            {saving && <LoaderCircle size={17} className="animate-spin"/>}Save customer
                        </button>
                    </div>
                </form>
            </div>}
    </>;
}

function CustomerRow({customer, edit}: { customer: Customer; edit: () => void }) {
    return <tr>
        <td className="td"><b>{customer.name}</b><small className="block text-slate-500">{customer.customerCode}</small>
        </td>
        <td className={`td font-bold ${customer.advanceBalance > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            {customer.advanceBalance > 0 ? `Advance ${money(customer.advanceBalance)}` : money(customer.outstandingBalance)}
        </td>
        <td className="td">{customer.phone || '—'}<small className="block text-slate-500">{customer.nic || '—'}</small>
        </td>
        <td className="td">{dateTime(customer.createdAt)}</td>
        <td className="td"><Status value={customer.status}/></td>
        <td className="td">
            <div className="flex gap-2"><Link to={`/customers/${customer._id}`} className="btn-secondary"
                                              title="View"><Eye size={16}/></Link>
                <button className="btn-secondary" onClick={edit} title="Edit"><Edit3 size={16}/></button>
            </div>
        </td>
    </tr>;
}

function CustomerCard({customer, edit}: { customer: Customer; edit: () => void }) {
    const hasAdvance = customer.advanceBalance > 0;
    return <article
        className="min-w-0 overflow-hidden rounded-2xl border border-pastel_mauve_6-700 bg-white shadow-sm dark:border-indigo_ink-400 dark:bg-deep_amethyst-500">
        <div
            className="flex min-w-0 items-start justify-between gap-3 border-b border-pastel_mauve_6-700 p-4 dark:border-indigo_ink-400">
            <div className="min-w-0"><h2 className="truncate font-extrabold">{customer.name}</h2><p
                className="text-xs text-slate-500">{customer.customerCode}</p></div>
            <Status value={customer.status}/>
        </div>

        <div className="p-4">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {hasAdvance ? 'Advance balance' : 'Outstanding balance'}
      </span>
            <strong className={`mt-1 block break-words text-xl ${hasAdvance ? 'text-blue-600' : 'text-rose-600'}`}>
                {money(hasAdvance ? customer.advanceBalance : customer.outstandingBalance)}
            </strong>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0"><span
                    className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-500"><Phone
                    size={13}/>Phone</span><span className="mt-1 block break-all">{customer.phone || '—'}</span></div>
                <div className="min-w-0"><span
                    className="block text-[11px] font-bold uppercase text-slate-500">NIC / ID</span><span
                    className="mt-1 block break-all">{customer.nic || '—'}</span></div>
                <div className="col-span-2 min-w-0"><span
                    className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-500"><MapPin
                    size={13}/>Address</span><span
                    className="mt-1 line-clamp-2 block break-words">{customer.address || 'No address provided'}</span>
                </div>
                <div className="col-span-2 min-w-0"><span
                    className="block text-[11px] font-bold uppercase text-slate-500">Registered</span><span
                    className="mt-1 block">{dateTime(customer.createdAt)}</span></div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-pastel_mauve_6-700 p-3 dark:border-indigo_ink-400">
            <Link to={`/customers/${customer._id}`} className="btn-secondary min-w-0"><Eye size={16}/>View</Link>
            <button className="btn-secondary min-w-0" onClick={edit}><Edit3 size={16}/>Edit</button>
        </div>
    </article>;
}

function Field({label, value, onChange, required = false, inputMode}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    inputMode?: 'text' | 'tel' | 'numeric';
}) {
    return <label className="min-w-0"><span className="label">{label}</span><input className="input min-w-0"
                                                                                   value={value || ''}
                                                                                   required={required}
                                                                                   inputMode={inputMode}
                                                                                   onChange={event => onChange(event.target.value)}/></label>;
}