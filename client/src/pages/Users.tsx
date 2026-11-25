import {useEffect, useState} from 'react';
import {Edit3, KeyRound, Power, PowerOff, X} from 'lucide-react';
import {api, message} from '../services/api';
import {dateTime} from '../utils/format';
import {Empty, PageTitle, Spinner, Status} from '../components/UI';

export default function Users() {
    const [data, setData] = useState<any>(null), [edit, setEdit] = useState<any>(null), [error, setError] = useState('');
    const load = () => api.get('/users').then(r => setData(r.data));
    useEffect(() => {
        load()
    }, []);

    async function save(e: any) {
        e.preventDefault();
        try {
            await api.put(`/users/${edit._id}`, edit);
            setEdit(null);
            load()
        } catch (e) {
            setError(message(e))
        }
    }

    async function password(u: any) {
        const password = prompt(`Enter a new password for ${u.username} (minimum 10 characters):`);
        if (!password) return;
        try {
            await api.post(`/users/${u._id}/change-password`, {password});
            alert('Password changed successfully.')
        } catch (e) {
            alert(message(e))
        }
    }

    async function toggle(u: any) {
        if (!confirm(`${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${u.username}?`)) return;
        try {
            await api.post(`/users/${u._id}/${u.status === 'ACTIVE' ? 'deactivate' : 'activate'}`);
            load()
        } catch (e) {
            alert(message(e))
        }
    }

    return <><PageTitle title="පරිශීලකයන්" subtitle="Admin user management - passwords are never displayed"/>
        <div className="card min-w-0">{!data ? <Spinner/> : !data.items.length ?
            <Empty title="No users found." body="User accounts will appear here."/> : <>
                <div className="grid min-w-0 gap-3 xl:hidden">
                    {data.items.map((u: any) => <article key={u._id}
                                                         className="min-w-0 overflow-hidden rounded-2xl border border-pastel_mauve_6-700 bg-white shadow-sm dark:border-indigo_ink-400 dark:bg-deep_amethyst-500">
                        <div
                            className="flex min-w-0 items-start justify-between gap-3 border-b border-pastel_mauve_6-700 p-4 dark:border-indigo_ink-400">
                            <div className="min-w-0">
                                <h2 className="font-extrabold [overflow-wrap:anywhere]">{u.fullName}</h2>
                                <p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere]">{u.username}</p>
                            </div>
                            <div className="shrink-0"><Status value={u.status}/></div>
                        </div>
                        <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
                            <div className="col-span-2 min-w-0">
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Role</dt>
                                <dd className="mt-1 break-words">{u.role}</dd>
                            </div>
                            <div className="min-w-0">
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Created</dt>
                                <dd className="mt-1 break-words">{dateTime(u.createdAt)}</dd>
                            </div>
                            <div className="min-w-0">
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Last
                                    login
                                </dt>
                                <dd className="mt-1 break-words">{dateTime(u.lastLogin)}</dd>
                            </div>
                        </dl>
                        <div
                            className="grid grid-cols-2 gap-2 border-t border-pastel_mauve_6-700 p-3 dark:border-indigo_ink-400">
                            <button type="button" className="btn-secondary min-w-0 px-2"
                                    aria-label={`Edit biodata for ${u.username}`}
                                    onClick={() => {
                                        setError('');
                                        setEdit({...u});
                                    }}><Edit3 size={16}/>Edit
                            </button>
                            <button type="button" className="btn-secondary min-w-0 px-2"
                                    aria-label={`Change password for ${u.username}`}
                                    onClick={() => password(u)}><KeyRound size={16}/>Password
                            </button>
                            <button type="button"
                                    className={`btn-secondary col-span-2 min-w-0 px-2 ${u.status === 'ACTIVE' ? 'text-red-600' : 'text-deep_lilac-500 dark:text-lavender_purple-600'}`}
                                    aria-label={`${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${u.username}`}
                                    onClick={() => toggle(u)}>
                                {u.status === 'ACTIVE' ? <PowerOff size={16}/> : <Power size={16}/>}
                                {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </article>)}
                </div>
                <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[900px]">
                        <thead>
                        <tr>
                            <th className="th">Name</th>
                            <th className="th">Username</th>
                            <th className="th">Role</th>
                            <th className="th">Status</th>
                            <th className="th">Created</th>
                            <th className="th">Last Login</th>
                            <th className="th">Actions</th>
                        </tr>
                        </thead>
                        <tbody>{data.items.map((u: any) => <tr key={u._id}>
                            <td className="td font-bold">{u.fullName}</td>
                            <td className="td">{u.username}</td>
                            <td className="td">{u.role}</td>
                            <td className="td"><Status value={u.status}/></td>
                            <td className="td">{dateTime(u.createdAt)}</td>
                            <td className="td">{dateTime(u.lastLogin)}</td>
                            <td className="td">
                                <div className="flex gap-2">
                                    <button className="btn-secondary" title="Edit biodata"
                                            aria-label={`Edit biodata for ${u.username}`} onClick={() => {
                                        setError('');
                                        setEdit({...u});
                                    }}>
                                        <Edit3 size={16}/></button>
                                    <button className="btn-secondary" title="Change password"
                                            aria-label={`Change password for ${u.username}`}
                                            onClick={() => password(u)}>
                                        <KeyRound size={16}/></button>
                                    <button
                                        className={`btn-secondary ${u.status === 'ACTIVE' ? 'text-red-600' : 'text-deep_lilac-500 dark:text-lavender_purple-600'}`}
                                        title={u.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
                                        aria-label={`${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${u.username}`}
                                        onClick={() => toggle(u)}>{u.status === 'ACTIVE' ? <PowerOff size={16}/> :
                                        <Power size={16}/>}</button>
                                </div>
                            </td>
                        </tr>)}</tbody>
                    </table>
                </div>
            </>}</div>
        {edit && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
            <form
                className="max-h-[100dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[95vh] sm:rounded-3xl sm:p-6"
                onSubmit={save}>
                <div className="mb-5 flex"><h2 className="text-xl font-extrabold">Edit user biodata</h2>
                    <button type="button" className="ml-auto rounded-lg p-2" aria-label="Close edit dialog"
                            onClick={() => setEdit(null)}><X/></button>
                </div>
                {error && <p className="mb-4 text-red-600">{error}</p>}
                <div className="grid gap-4 sm:grid-cols-2">{['fullName', 'phone', 'email', 'address'].map(k => <label
                    key={k}><span className="label">{k.replace(/([A-Z])/g, ' $1')}</span><input className="input"
                                                                                                value={edit[k] || ''}
                                                                                                onChange={e => setEdit({
                                                                                                    ...edit,
                                                                                                    [k]: e.target.value
                                                                                                })}/></label>)}</div>
                <label className="mt-4 block"><span className="label">Bio</span><textarea className="input"
                                                                                          value={edit.bio || ''}
                                                                                          onChange={e => setEdit({
                                                                                              ...edit,
                                                                                              bio: e.target.value
                                                                                          })}/></label>
                <div
                    className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t bg-white px-4 pb-[max(.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:p-0">
                    <button type="button" className="btn-secondary flex-1 sm:flex-none"
                            onClick={() => setEdit(null)}>Cancel
                    </button>
                    <button className="btn-primary flex-1 sm:flex-none">Save changes</button>
                </div>
            </form>
        </div>}</>
}