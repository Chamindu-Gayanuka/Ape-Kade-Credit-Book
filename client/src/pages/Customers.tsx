import {useEffect, useState} from "react";
import {Plus, Search, Edit3, X, Eye} from "lucide-react";
import {Link} from "react-router-dom";
import {api, message} from "../services/api";
import type {Customer} from "../types";
import {money, dateTime} from "../utils/format";
import {
    Empty,
    PageTitle,
    Pagination,
    Spinner,
    Status,
} from "../components/UI";

const blank = {
    name: "",
    phone: "",
    nic: "",
    address: "",
    notes: "",
    status: "ACTIVE",
};
export default function Customers() {
    const [data, setData] = useState<any>(null),
        [search, setSearch] = useState(""),
        [page, setPage] = useState(1),
        [editing, setEditing] = useState<any>(null),
        [error, setError] = useState("");
    const load = () =>
        api
            .get("/customers", {params: {search, page}})
            .then((r) => setData(r.data));
    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [search, page]);

    async function save(e: any) {
        e.preventDefault();
        setError("");
        try {
            editing._id
                ? await api.put(`/customers/${editing._id}`, editing)
                : await api.post("/customers", editing);
            setEditing(null);
            load();
        } catch (e) {
            setError(message(e));
        }
    }

    return (
        <>
            <PageTitle
                title="ගනුදෙනුකරුවන්"
                subtitle="Customers and outstanding balances"
                action={
                    <button
                        className="btn-primary"
                        onClick={() => setEditing({...blank})}
                    >
                        <Plus size={18}/>
                        Add customer
                    </button>
                }
            />
            <div className="card">
                <div className="relative mb-5 max-w-md">
                    <Search className="absolute left-3 top-3 text-slate-400" size={19}/>
                    <input
                        className="input pl-10"
                        placeholder="Search name, phone, ID or NIC…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                {!data ? (
                    <Spinner/>
                ) : !data.items.length ? (
                    <Empty
                        title="No customers found."
                        body="Add your first customer to begin managing credit."
                        action={
                            <button
                                className="btn-primary"
                                onClick={() => setEditing({...blank})}
                            >
                                Add customer
                            </button>
                        }
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px]">
                                <thead>
                                <tr>
                                    <th className="th">Customer</th>
                                    <th className="th">Phone / NIC</th>
                                    <th className="th">Registered</th>
                                    <th className="th">Balance</th>
                                    <th className="th">Status</th>
                                    <th className="th"></th>
                                </tr>
                                </thead>
                                <tbody>
                                {data.items.map((c: Customer) => (
                                    <tr key={c._id}>
                                        <td className="td">
                                            <b>{c.name}</b>
                                            <small className="block text-slate-500">
                                                {c.customerCode}
                                            </small>
                                        </td>
                                        <td className="td">
                                            {c.phone || "—"}
                                            <small className="block text-slate-500">
                                                {c.nic || "—"}
                                            </small>
                                        </td>
                                        <td className="td">{dateTime(c.createdAt)}</td>
                                        <td
                                            className={`td font-bold ${c.advanceBalance > 0 ? "text-blue-600" : "text-rose-600"}`}
                                        >
                                            {c.advanceBalance > 0
                                                ? `Advance ${money(c.advanceBalance)}`
                                                : money(c.outstandingBalance)}
                                        </td>
                                        <td className="td">
                                            <Status value={c.status}/>
                                        </td>
                                        <td className="td">
                                            <div className="flex gap-2">
                                                <Link
                                                    to={`/customers/${c._id}`}
                                                    className="btn-secondary"
                                                >
                                                    <Eye size={16}/>
                                                </Link>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => setEditing({...c})}
                                                >
                                                    <Edit3 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={data.page}
                            pages={data.pages}
                            onChange={setPage}
                        />
                    </>
                )}
            </div>
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                    <form
                        onSubmit={save}
                        className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
                    >
                        <div className="mb-5 flex">
                            <div>
                                <h2 className="text-xl font-extrabold">
                                    {editing._id ? "Edit customer" : "New customer"}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    සත්‍ය ගනුදෙනුකරුගේ තොරතුරු
                                </p>
                            </div>
                            <button
                                type="button"
                                className="ml-auto"
                                onClick={() => setEditing(null)}
                            >
                                <X/>
                            </button>
                        </div>
                        {error && (
                            <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </p>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Customer Name *"
                                value={editing.name}
                                set={(v: string) => setEditing({...editing, name: v})}
                            />
                            <Field
                                label="Phone Number"
                                value={editing.phone}
                                set={(v: string) => setEditing({...editing, phone: v})}
                            />
                            <Field
                                label="NIC / ID"
                                value={editing.nic}
                                set={(v: string) => setEditing({...editing, nic: v})}
                            />
                            {editing._id && (
                                <label>
                                    <span className="label">Status</span>
                                    <select
                                        className="input"
                                        value={editing.status}
                                        onChange={(e) =>
                                            setEditing({...editing, status: e.target.value})
                                        }
                                    >
                                        <option>ACTIVE</option>
                                        <option>INACTIVE</option>
                                    </select>
                                </label>
                            )}
                        </div>
                        <label className="mt-4 block">
                            <span className="label">Address</span>
                            <textarea
                                className="input"
                                value={editing.address}
                                onChange={(e) =>
                                    setEditing({...editing, address: e.target.value})
                                }
                            />
                        </label>
                        <label className="mt-4 block">
                            <span className="label">Notes</span>
                            <textarea
                                className="input"
                                value={editing.notes}
                                onChange={(e) =>
                                    setEditing({...editing, notes: e.target.value})
                                }
                            />
                        </label>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setEditing(null)}
                            >
                                Cancel
                            </button>
                            <button className="btn-primary">Save customer</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function Field({
                   label,
                   value,
                   set,
               }: {
    label: string;
    value: string;
    set: (v: string) => void;
}) {
    return (
        <label>
            <span className="label">{label}</span>
            <input
                className="input"
                value={value || ""}
                onChange={(e) => set(e.target.value)}
                required={label.includes("*")}
            />
        </label>
    );
}