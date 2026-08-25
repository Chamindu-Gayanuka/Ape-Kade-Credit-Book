import {LoaderCircle, Inbox, ChevronLeft, ChevronRight} from 'lucide-react';
import type {ReactNode} from 'react';

export const Spinner = () => <div className="flex min-h-48 items-center justify-center"><LoaderCircle
    className="animate-spin text-forest-600"/></div>;

export function Empty({title, body, action}: { title: string; body: string; action?: ReactNode }) {
    return <div className="flex flex-col items-center py-14 text-center">
        <div className="mb-4 rounded-2xl bg-forest-50 p-4"><Inbox className="text-forest-600"/></div>
        <h3 className="font-bold">{title}</h3><p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>{action &&
        <div className="mt-5">{action}</div>}</div>
}

export const Status = ({value}: { value: string }) => <span
    className={`badge ${value === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : value === 'VOID' || value === 'INACTIVE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{value}</span>;

export function Pagination({page, pages, onChange}: { page: number; pages: number; onChange: (p: number) => void }) {
    if (pages <= 1) return null;
    return <div className="mt-5 flex items-center justify-end gap-2">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft
            size={17}/></button>
        <span className="text-sm">{page} / {pages}</span>
        <button className="btn-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight
            size={17}/></button>
    </div>
}

export function PageTitle({title, subtitle, action}: { title: string; subtitle?: string; action?: ReactNode }) {
    return <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>{subtitle &&
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
        {action}</div>
}
