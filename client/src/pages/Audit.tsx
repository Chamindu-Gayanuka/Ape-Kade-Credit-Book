import {useEffect, useState} from "react";
import {ShieldCheck} from "lucide-react";
import {api} from "../services/api";
import {dateTime} from "../utils/format";
import {Empty, PageTitle, Pagination, Spinner} from "../components/UI";

export default function Audit() {
    const [data, setData] = useState<any>(null),
        [page, setPage] = useState(1),
        [action, setAction] = useState("");
    useEffect(() => {
        api
            .get("/audit-logs", {params: {page, action}})
            .then((r) => setData(r.data));
    }, [page, action]);
    return (
        <>
            <PageTitle
                title="ක්‍රියාකාරකම්"
                subtitle="Permanent admin-only audit trail"
            />
            <div className="card">
                <select
                    className="input mb-5 max-w-xs"
                    value={action}
                    onChange={(e) => {
                        setAction(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All actions</option>
                    {[
                        "LOGIN",
                        "LOGOUT",
                        "CUSTOMER_CREATED",
                        "CUSTOMER_UPDATED",
                        "CUSTOMER_DELETED",
                        "CREDIT_CREATED",
                        "PAYMENT_CREATED",
                        "TRANSACTION_VOIDED",
                        "TRANSACTION_CORRECTED",
                        "USER_UPDATED",
                        "PASSWORD_CHANGED",
                        "USER_ACTIVATED",
                        "USER_DEACTIVATED",
                        "SETTINGS_CHANGED",
                    ].map((x) => (
                        <option key={x}>{x}</option>
                    ))}
                </select>
                {!data ? (
                    <Spinner/>
                ) : !data.items.length ? (
                    <Empty
                        title="No audit activity found."
                        body="Genuine system actions will be recorded here."
                    />
                ) : (
                    <>
                        <div className="space-y-2">
                            {data.items.map((a: any) => (
                                <div
                                    key={a._id}
                                    className="flex gap-3 rounded-xl border border-slate-100 p-4"
                                >
                                    <div className="rounded-xl bg-forest-50 p-2 text-forest-600">
                                        <ShieldCheck size={19}/>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap gap-2">
                                            <b>{a.action}</b>
                                            <span className="text-sm text-slate-500">
                        by {a.userId?.fullName || "System"}
                      </span>
                                        </div>
                                        <p className="text-sm text-slate-600">{a.description}</p>
                                        <small className="text-slate-400">
                                            {dateTime(a.createdAt)} ·{" "}
                                            {a.ipAddress || "IP unavailable"}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Pagination
                            page={data.page}
                            pages={data.pages}
                            onChange={setPage}
                        />
                    </>
                )}
            </div>
        </>
    );
}