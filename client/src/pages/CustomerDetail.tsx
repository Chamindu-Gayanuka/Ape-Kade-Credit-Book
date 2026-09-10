import {useEffect, useState} from "react";
import {useNavigate, useParams, Link} from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    CreditCard,
    LoaderCircle,
    ReceiptText,
    Trash2,
    X,
} from "lucide-react";
import {api, message} from "../services/api";
import {useAuth} from "../contexts/AuthContext";
import {money, dateTime} from "../utils/format";
import {PageTitle, Spinner, Status, Empty} from "../components/UI";

export default function CustomerDetail() {
    const {id} = useParams();
    const navigate = useNavigate();
    const {user} = useAuth();
    const [customer, setCustomer] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [impact, setImpact] = useState<any>(null);
    const [showDelete, setShowDelete] = useState(false);
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [reason, setReason] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get(`/customers/${id}`),
            api.get(`/customers/${id}/transactions`),
        ]).then(([customerResponse, transactionResponse]) => {
            setCustomer(customerResponse.data);
            setTransactions(transactionResponse.data.items);
        });
    }, [id]);

    async function openDeleteDialog() {
        setShowDelete(true);
        setLoadingImpact(true);
        setDeleteError("");
        setConfirmation("");
        setReason("");
        try {
            const {data} = await api.get(`/customers/${id}/deletion-impact`);
            setImpact(data);
        } catch (error) {
            setDeleteError(message(error));
        } finally {
            setLoadingImpact(false);
        }
    }

    async function permanentlyDelete() {
        if (!impact) return;
        setDeleting(true);
        setDeleteError("");
        try {
            await api.delete(`/customers/${id}`, {data: {confirmation, reason}});
            navigate("/customers", {replace: true});
        } catch (error) {
            setDeleteError(message(error));
        } finally {
            setDeleting(false);
        }
    }

    if (!customer) return <Spinner/>;
    return (
        <>
            <Link
                to="/customers"
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-forest-700"
            >
                <ArrowLeft size={17}/>
                Customers
            </Link>
            <PageTitle
                title={customer.name}
                subtitle={`${customer.customerCode} · Registered ${dateTime(customer.createdAt)}`}
                action={
                    <div className="flex gap-2">
                        <Link to="/credit" className="btn-primary">
                            <ReceiptText size={17}/>
                            Credit
                        </Link>
                        <Link to="/payment" className="btn-secondary">
                            <CreditCard size={17}/>
                            Payment
                        </Link>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <div className="card">
          <span className="text-sm text-slate-500">
            {customer.advanceBalance > 0
                ? "Advance balance"
                : "Outstanding balance"}
          </span>
                    <strong
                        className={`mt-2 block text-3xl ${customer.advanceBalance > 0 ? "text-blue-600" : "text-rose-600"}`}
                    >
                        {money(
                            customer.advanceBalance > 0
                                ? customer.advanceBalance
                                : customer.outstandingBalance,
                        )}
                    </strong>
                </div>
                <div className="card">
                    <span className="text-sm text-slate-500">Contact</span>
                    <b className="mt-2 block">{customer.phone || "—"}</b>
                    <span className="text-sm text-slate-500">
            NIC: {customer.nic || "—"}
          </span>
                </div>
                <div className="card">
                    <span className="text-sm text-slate-500">Account status</span>
                    <div className="mt-3">
                        <Status value={customer.status}/>
                    </div>
                </div>
            </div>

            <div className="card mt-4">
                <h2 className="mb-4 font-extrabold">Transaction history</h2>
                {!transactions.length ? (
                    <Empty
                        title="No transactions found."
                        body="Credit and payment transactions will appear here."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr>
                                <th className="th">ID / Date</th>
                                <th className="th">Type</th>
                                <th className="th">Category</th>
                                <th className="th">Amount</th>
                                <th className="th">Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {transactions.map((transaction) => (
                                <tr key={transaction._id}>
                                    <td className="td">
                                        <b>{transaction.transactionCode}</b>
                                        <small className="block text-slate-500">
                                            {dateTime(transaction.createdAt)}
                                        </small>
                                    </td>
                                    <td className="td">{transaction.transactionType}</td>
                                    <td className="td">
                                        {transaction.categoryId?.name || "—"}
                                    </td>
                                    <td
                                        className={`td font-bold ${transaction.transactionType === "PAYMENT" ? "text-emerald-600" : "text-rose-600"}`}
                                    >
                                        {money(transaction.amount)}
                                    </td>
                                    <td className="td">
                                        <Status value={transaction.status}/>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {user.role === "ADMIN" && (
                <div className="card mt-4 border-red-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-xl bg-red-50 p-3 text-red-600">
                            <Trash2/>
                        </div>
                        <div>
                            <h2 className="font-extrabold text-red-700">Danger zone</h2>
                            <p className="text-sm text-slate-500">
                                Review connected records before permanently deleting this
                                customer.
                            </p>
                        </div>
                        <button
                            className="btn ml-auto bg-red-600 text-white hover:bg-red-700"
                            onClick={openDeleteDialog}
                        >
                            <Trash2 size={17}/>
                            Delete customer and connected data
                        </button>
                    </div>
                </div>
            )}

            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
                    <div
                        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-red-50 p-3 text-red-600">
                                <AlertTriangle/>
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-red-700">
                                    Permanent customer deletion
                                </h2>
                                <p className="text-sm text-slate-500">
                                    This operation cannot be undone.
                                </p>
                            </div>
                            <button
                                className="ml-auto"
                                onClick={() => setShowDelete(false)}
                                disabled={deleting}
                            >
                                <X/>
                            </button>
                        </div>

                        {deleteError && (
                            <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                {deleteError}
                            </div>
                        )}
                        {loadingImpact ? (
                            <Spinner/>
                        ) : (
                            impact && (
                                <>
                                    <div className="mt-5 rounded-2xl border border-red-200 p-4">
                                        <b>{impact.customer.name}</b>
                                        <span className="ml-2 text-sm text-slate-500">
                      {impact.customer.customerCode}
                    </span>
                                        <h3 className="mb-3 mt-5 text-sm font-extrabold uppercase tracking-wide text-slate-500">
                                            Connected data
                                        </h3>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Impact
                                                label="Credit transactions"
                                                value={impact.connectedData.credits.count}
                                                detail={money(impact.connectedData.credits.amount)}
                                            />
                                            <Impact
                                                label="Payment transactions"
                                                value={impact.connectedData.payments.count}
                                                detail={money(impact.connectedData.payments.amount)}
                                            />
                                            <Impact
                                                label="Adjustments"
                                                value={impact.connectedData.adjustments.count}
                                                detail={money(impact.connectedData.adjustments.amount)}
                                            />
                                            <Impact
                                                label="Correction links"
                                                value={impact.connectedData.corrections}
                                            />
                                            <Impact
                                                label="Total transactions"
                                                value={impact.connectedData.totalTransactions}
                                            />
                                            <Impact
                                                label="Audit references retained"
                                                value={impact.connectedData.auditReferences}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                                        <b>Will be deleted:</b> customer profile, credits, payments,
                                        adjustments, and correction links.
                                        <br/>
                                        <b>Will be retained:</b> security audit logs and a new
                                        permanent deletion audit record.
                                    </div>

                                    <label className="mt-5 block">
                                        <span className="label">Reason for deletion *</span>
                                        <textarea
                                            className="input"
                                            rows={3}
                                            minLength={5}
                                            value={reason}
                                            onChange={(event) => setReason(event.target.value)}
                                            placeholder="Enter a clear reason (minimum 5 characters)"
                                        />
                                    </label>
                                    <label className="mt-4 block">
                    <span className="label">
                      Type <b>{impact.customer.customerCode}</b> to confirm *
                    </span>
                                        <input
                                            className="input"
                                            value={confirmation}
                                            onChange={(event) => setConfirmation(event.target.value)}
                                        />
                                    </label>
                                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                                        <button
                                            className="btn-secondary"
                                            onClick={() => setShowDelete(false)}
                                            disabled={deleting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                            disabled={
                                                deleting ||
                                                confirmation !== impact.customer.customerCode ||
                                                reason.trim().length < 5
                                            }
                                            onClick={permanentlyDelete}
                                        >
                                            {deleting ? (
                                                <LoaderCircle size={17} className="animate-spin"/>
                                            ) : (
                                                <Trash2 size={17}/>
                                            )}
                                            Permanently delete all connected data
                                        </button>
                                    </div>
                                </>
                            )
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function Impact({
                    label,
                    value,
                    detail,
                }: {
    label: string;
    value: number;
    detail?: string;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-3">
            <span className="block text-xs text-slate-500">{label}</span>
            <b className="text-lg">{value}</b>
            {detail && <small className="ml-2 text-slate-500">{detail}</small>}
        </div>
    );
}