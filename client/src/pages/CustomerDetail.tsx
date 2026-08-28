import {useEffect, useState} from "react";
import {useParams, Link} from "react-router-dom";
import {ArrowLeft, ReceiptText, CreditCard} from "lucide-react";
import {api} from "../services/api";
import {money, dateTime} from "../utils/format";
import {PageTitle, Spinner, Status, Empty} from "../components/UI";

export default function CustomerDetail() {
    const {id} = useParams(),
        [c, setC] = useState<any>(null),
        [tx, setTx] = useState<any[]>([]);
    useEffect(() => {
        Promise.all([
            api.get(`/customers/${id}`),
            api.get(`/customers/${id}/transactions`),
        ]).then(([a, b]) => {
            setC(a.data);
            setTx(b.data.items);
        });
    }, [id]);
    if (!c) return <Spinner/>;
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
                title={c.name}
                subtitle={`${c.customerCode} · Registered ${dateTime(c.createdAt)}`}
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
            {c.advanceBalance > 0 ? "Advance balance" : "Outstanding balance"}
          </span>
                    <strong
                        className={`mt-2 block text-3xl ${c.advanceBalance > 0 ? "text-blue-600" : "text-rose-600"}`}
                    >
                        {money(
                            c.advanceBalance > 0 ? c.advanceBalance : c.outstandingBalance,
                        )}
                    </strong>
                </div>
                <div className="card">
                    <span className="text-sm text-slate-500">Contact</span>
                    <b className="mt-2 block">{c.phone || "—"}</b>
                    <span className="text-sm text-slate-500">NIC: {c.nic || "—"}</span>
                </div>
                <div className="card">
                    <span className="text-sm text-slate-500">Account status</span>
                    <div className="mt-3">
                        <Status value={c.status}/>
                    </div>
                </div>
            </div>
            <div className="card mt-4">
                <h2 className="mb-4 font-extrabold">Transaction history</h2>
                {!tx.length ? (
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
                            {tx.map((t) => (
                                <tr key={t._id}>
                                    <td className="td">
                                        <b>{t.transactionCode}</b>
                                        <small className="block text-slate-500">
                                            {dateTime(t.createdAt)}
                                        </small>
                                    </td>
                                    <td className="td">{t.transactionType}</td>
                                    <td className="td">{t.categoryId?.name || "—"}</td>
                                    <td
                                        className={`td font-bold ${t.transactionType === "PAYMENT" ? "text-emerald-600" : "text-rose-600"}`}
                                    >
                                        {money(t.amount)}
                                    </td>
                                    <td className="td">
                                        <Status value={t.status}/>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}