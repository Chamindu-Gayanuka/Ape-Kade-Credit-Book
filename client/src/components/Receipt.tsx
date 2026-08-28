import { Printer, X } from 'lucide-react';
import type { Tx } from '../types';
import { money, dateTime } from '../utils/format';

export default function Receipt({ tx, onClose }: { tx: Tx; onClose: () => void }) {
    const rows: Array<[string, string]> = [
        ['Customer', tx.customerId?.name || '—'],
        ['Transaction Type', tx.transactionType],
        ['Category', tx.categoryId?.name || '—'],
        ['Amount', money(tx.amount)],
        ['Previous Outstanding', money(tx.previousBalance)],
    ];
    if ((tx.previousAdvanceBalance || 0) > 0) {
        rows.push(['Previous Advance', money(tx.previousAdvanceBalance)]);
    }
    rows.push(['Remaining Outstanding', money(tx.remainingBalance)]);
    if ((tx.advanceBalance || 0) > 0) {
        rows.push(['Advance Balance', money(tx.advanceBalance)]);
    }
    rows.push(
        ['Date / Time', dateTime(tx.createdAt)],
        ['Recorded By', tx.createdBy?.fullName || '—'],
        ['Transaction ID', tx.transactionCode],
    );

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="receipt w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="no-print mb-4 flex justify-end">
                <button onClick={onClose}><X /></button>
            </div>
            <div className="text-center">
                <h1 className="text-2xl font-black">අපේ කඩේ ණය පොත</h1>
                <p className="font-bold tracking-[.3em]">APE KADE</p>
                <div className="my-5 border-t border-dashed" />
            </div>
            <dl className="space-y-3 text-sm">
                {rows.map(([label, value]) => <div className="flex justify-between gap-4" key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-bold">{value}</dd>
                </div>)}
            </dl>
            <div className="my-5 border-t border-dashed" />
            <p className="text-center text-xs text-slate-500">ස්තූතියි! · Thank you</p>
            <button className="btn-primary no-print mt-6 w-full" onClick={() => window.print()}>
                <Printer size={18} />Print receipt
            </button>
        </div>
    </div>;
}