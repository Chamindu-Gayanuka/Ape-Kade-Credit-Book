import {useEffect, useMemo, useState} from "react";
import {
    CheckCircle2,
    LoaderCircle,
    Plus,
    Search,
    UserRound,
    X,
} from "lucide-react";
import {api, message} from "../services/api";
import type {Category, Customer, Tx} from "../types";
import {money} from "../utils/format";
import {PageTitle} from "../components/UI";
import Receipt from "../components/Receipt";

const emptyCustomer = {name: "", phone: "", nic: "", address: "", notes: ""};
const emptyTransaction = {
    amount: "",
    categoryId: "",
    description: "",
    paymentMethod: "Cash",
    referenceNumber: "",
    notes: "",
    customCategoryName: "",
};

export default function FinancialForm({
                                          type,
                                      }: {
    type: "credit" | "payment";
}) {
    const isCredit = type === "credit";
    const [search, setSearch] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [cats, setCats] = useState<Category[]>([]);
    const [form, setForm] = useState<any>({...emptyTransaction});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [tx, setTx] = useState<Tx | null>(null);
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({...emptyCustomer});
    const [customerError, setCustomerError] = useState("");
    const [customerBusy, setCustomerBusy] = useState(false);

    const loadCategories = () =>
        api
            .get("/categories")
            .then((r) =>
                setCats(r.data.filter((x: Category) => x.status === "ACTIVE")),
            );

    useEffect(() => {
        loadCategories();
    }, []);
    useEffect(() => {
        if (customer || !search.trim()) {
            setCustomers([]);
            return;
        }
        const timer = setTimeout(() => {
            api
                .get("/customers", {params: {search, status: "ACTIVE", limit: 8}})
                .then((r) => setCustomers(r.data.items));
        }, 250);
        return () => clearTimeout(timer);
    }, [search, customer]);

    const selectedCategory = useMemo(
        () => cats.find((c) => c._id === form.categoryId),
        [cats, form.categoryId],
    );
    const isOther = selectedCategory?.name.toLowerCase() === "other";

    async function createCustomer(e: React.FormEvent) {
        e.preventDefault();
        setCustomerBusy(true);
        setCustomerError("");
        try {
            const {data} = await api.post("/customers", newCustomer);
            const created: Customer = {...data, outstandingBalance: 0};
            setCustomer(created);
            setSearch("");
            setCustomers([]);
            setNewCustomer({...emptyCustomer});
            setShowCustomerForm(false);
        } catch (err) {
            setCustomerError(message(err));
        } finally {
            setCustomerBusy(false);
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!customer) return setError("Please select or add a customer.");
        setBusy(true);
        setError("");
        try {
            let categoryId = form.categoryId;
            // Selecting Other offers a real custom category. It is created first and then
            // the resulting MongoDB category ID is saved on the financial transaction.
            if (isCredit && isOther && form.customCategoryName.trim()) {
                const {data: category} = await api.post("/categories", {
                    name: form.customCategoryName.trim(),
                    description: "Created during credit entry",
                });
                categoryId = category._id;
                await loadCategories();
            }
            const {data} = await api.post(`/transactions/${type}`, {
                ...form,
                categoryId,
                customerId: customer._id,
                amount: Number(form.amount),
                customCategoryName: undefined,
            });
            setTx(data);
            setCustomer((current) =>
                current
                    ? {
                        ...current,
                        outstandingBalance: data.remainingBalance || 0,
                        advanceBalance: data.advanceBalance || 0,
                        ledgerBalance: data.ledgerBalance || 0,
                    }
                    : current,
            );
            setForm({...emptyTransaction});
        } catch (err) {
            setError(message(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageTitle
                title={isCredit ? "ණය ගනුදෙනුව" : "ගෙවීමක් සටහන් කරන්න"}
                subtitle={
                    isCredit
                        ? "Record a new credit transaction"
                        : "Record an actual customer payment"
                }
            />
            <form
                onSubmit={submit}
                className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_360px]"
            >
                <div className="card">
                    <h2 className="mb-5 font-extrabold">Transaction details</h2>
                    {error && (
                        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mb-1.5 flex items-center justify-between">
                        <label className="label mb-0">Customer *</label>
                        {isCredit && !customer && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-sm font-bold text-forest-700"
                                onClick={() => {
                                    setNewCustomer({...emptyCustomer, name: search.trim()});
                                    setShowCustomerForm(true);
                                }}
                            >
                                <Plus size={16}/> Add new customer
                            </button>
                        )}
                    </div>

                    {customer ? (
                        <div className="mb-5 flex items-center rounded-xl border border-forest-200 bg-forest-50 p-3">
                            <UserRound className="mr-3 text-forest-600"/>
                            <div>
                                <b>{customer.name}</b>
                                <small className="block text-slate-500">
                                    {customer.customerCode} ·{" "}
                                    {customer.advanceBalance > 0
                                        ? `Advance ${money(customer.advanceBalance)}`
                                        : `Outstanding ${money(customer.outstandingBalance)}`}
                                </small>
                            </div>
                            <button
                                type="button"
                                className="ml-auto text-sm font-bold text-forest-700"
                                onClick={() => {
                                    setCustomer(null);
                                    setSearch("");
                                }}
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="relative mb-5">
                            <Search
                                className="absolute left-3 top-3 text-slate-400"
                                size={19}
                            />
                            <input
                                className="input pl-10"
                                placeholder="Search actual customer…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {customers.length > 0 && (
                                <div
                                    className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl">
                                    {customers.map((c) => (
                                        <button
                                            type="button"
                                            key={c._id}
                                            className="flex w-full justify-between p-3 text-left hover:bg-slate-50"
                                            onClick={() => {
                                                setCustomer(c);
                                                setCustomers([]);
                                            }}
                                        >
                      <span>
                        <b>{c.name}</b>
                        <small className="block text-slate-500">
                          {c.customerCode} · {c.phone}
                        </small>
                      </span>
                                            <b
                                                className={
                                                    c.advanceBalance > 0
                                                        ? "text-blue-600"
                                                        : "text-rose-600"
                                                }
                                            >
                                                {c.advanceBalance > 0
                                                    ? `Advance ${money(c.advanceBalance)}`
                                                    : money(c.outstandingBalance)}
                                            </b>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {isCredit && search.trim() && customers.length === 0 && (
                                <button
                                    type="button"
                                    className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-forest-700"
                                    onClick={() => {
                                        setNewCustomer({...emptyCustomer, name: search.trim()});
                                        setShowCustomerForm(true);
                                    }}
                                >
                                    <Plus size={16}/> Customer not found? Add “{search.trim()}”
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {isCredit ? (
                            <label>
                                <span className="label">Category *</span>
                                <select
                                    className="input"
                                    required
                                    value={form.categoryId}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            categoryId: e.target.value,
                                            customCategoryName: "",
                                        })
                                    }
                                >
                                    <option value="">Select Category</option>
                                    {cats.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <label>
                                <span className="label">Payment Method *</span>
                                <select
                                    className="input"
                                    value={form.paymentMethod}
                                    onChange={(e) =>
                                        setForm({...form, paymentMethod: e.target.value})
                                    }
                                >
                                    <option>Cash</option>
                                    <option>Bank Transfer</option>
                                    <option>Other</option>
                                </select>
                            </label>
                        )}
                        <label>
                            <span className="label">Amount (Rs.) *</span>
                            <input
                                className="input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={form.amount}
                                onChange={(e) => setForm({...form, amount: e.target.value})}
                            />
                        </label>
                    </div>

                    {isCredit && isOther && (
                        <label className="mt-4 block">
              <span className="label">
                New Category Name{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
              </span>
                            <input
                                className="input"
                                maxLength={60}
                                placeholder="Enter a category to create, or leave blank to use Other"
                                value={form.customCategoryName}
                                onChange={(e) =>
                                    setForm({...form, customCategoryName: e.target.value})
                                }
                            />
                            <small className="mt-1 block text-slate-500">
                                A new reusable category will be created when this credit is
                                saved.
                            </small>
                        </label>
                    )}

                    <label className="mt-4 block">
            <span className="label">
              {isCredit ? "Description" : "Reference Number"}
            </span>
                        <input
                            className="input"
                            value={isCredit ? form.description : form.referenceNumber}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    [isCredit ? "description" : "referenceNumber"]:
                                    e.target.value,
                                })
                            }
                        />
                    </label>
                    <label className="mt-4 block">
                        <span className="label">Notes</span>
                        <textarea
                            className="input"
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm({...form, notes: e.target.value})}
                        />
                    </label>
                    <button
                        className="btn-primary mt-6 w-full sm:w-auto"
                        disabled={busy || !customer}
                    >
                        {busy ? (
                            <LoaderCircle className="animate-spin"/>
                        ) : (
                            <CheckCircle2 size={18}/>
                        )}
                        {isCredit ? "Record credit" : "Record payment"}
                    </button>
                </div>

                <aside className="card h-fit bg-forest-900 text-white">
                    <h3 className="font-extrabold">Balance protection</h3>
                    <p className="mt-2 text-sm text-white/60">
                        {isCredit
                            ? "Credit is added to the selected customer’s calculated balance."
                            : "Payments above the outstanding debt are accepted and securely retained as a customer advance."}
                    </p>
                    <div className="mt-6 border-t border-white/10 pt-5">
            <span className="text-xs uppercase tracking-wide text-white/50">
              {(customer?.advanceBalance || 0) > 0
                  ? "Customer advance"
                  : "Selected customer balance"}
            </span>
                        <strong className="mt-1 block text-3xl">
                            {money(
                                (customer?.advanceBalance || 0) > 0
                                    ? customer!.advanceBalance
                                    : customer?.outstandingBalance || 0,
                            )}
                        </strong>
                    </div>
                </aside>
            </form>

            {showCustomerForm && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
                    <form
                        onSubmit={createCustomer}
                        className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
                    >
                        <div className="mb-5 flex items-start">
                            <div>
                                <h2 className="text-xl font-extrabold">Add customer</h2>
                                <p className="text-sm text-slate-500">
                                    Create the customer without leaving credit entry.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="ml-auto"
                                onClick={() => setShowCustomerForm(false)}
                            >
                                <X/>
                            </button>
                        </div>
                        {customerError && (
                            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                {customerError}
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <CustomerField
                                label="Customer Name *"
                                value={newCustomer.name}
                                onChange={(name) => setNewCustomer({...newCustomer, name})}
                                required
                            />
                            <CustomerField
                                label="Phone Number"
                                value={newCustomer.phone}
                                onChange={(phone) => setNewCustomer({...newCustomer, phone})}
                            />
                            <CustomerField
                                label="NIC / ID"
                                value={newCustomer.nic}
                                onChange={(nic) => setNewCustomer({...newCustomer, nic})}
                            />
                            <CustomerField
                                label="Address"
                                value={newCustomer.address}
                                onChange={(address) =>
                                    setNewCustomer({...newCustomer, address})
                                }
                            />
                        </div>
                        <label className="mt-4 block">
                            <span className="label">Notes</span>
                            <textarea
                                className="input"
                                value={newCustomer.notes}
                                onChange={(e) =>
                                    setNewCustomer({...newCustomer, notes: e.target.value})
                                }
                            />
                        </label>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowCustomerForm(false)}
                            >
                                Cancel
                            </button>
                            <button className="btn-primary" disabled={customerBusy}>
                                {customerBusy && (
                                    <LoaderCircle size={17} className="animate-spin"/>
                                )}{" "}
                                Add and select customer
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {tx && <Receipt tx={tx} onClose={() => setTx(null)}/>}
        </>
    );
}

function CustomerField({
                           label,
                           value,
                           onChange,
                           required = false,
                       }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) {
    return (
        <label>
            <span className="label">{label}</span>
            <input
                className="input"
                value={value}
                required={required}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}