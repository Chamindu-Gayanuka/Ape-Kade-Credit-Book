import {useEffect, useState} from 'react';
import {Edit3, KeyRound, Power, PowerOff, X} from 'lucide-react';
import {api, message} from '../services/api';
import {dateTime} from '../utils/format';
import {PageTitle, Spinner, Status} from '../components/UI';

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

    return <><PageTitle title="පරිශීලකයන්" subtitle="Admin user management — passwords are never displayed"/>
        <div className="card">{!data ? <Spinner/> : <div className="overflow-x-auto">
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
                            <button className="btn-secondary" title="Edit biodata" onClick={() => setEdit({...u})}>
                                <Edit3 size={16}/></button>
                            <button className="btn-secondary" title="Change password" onClick={() => password(u)}>
                                <KeyRound size={16}/></button>
                            <button
                                className={`btn-secondary ${u.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}`}
                                onClick={() => toggle(u)}>{u.status === 'ACTIVE' ? <PowerOff size={16}/> :
                                <Power size={16}/>}</button>
                        </div>
                    </td>
                </tr>)}</tbody>
            </table>
        </div>}</div>
        {edit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form className="w-full max-w-xl rounded-3xl bg-white p-6" onSubmit={save}>
                <div className="mb-5 flex"><h2 className="text-xl font-extrabold">Edit user biodata</h2>
                    <button type="button" className="ml-auto" onClick={() => setEdit(null)}><X/></button>
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
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
                    <button className="btn-primary">Save changes</button>
                </div>
            </form>
        </div>}</>
}
