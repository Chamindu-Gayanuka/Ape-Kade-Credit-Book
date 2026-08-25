import {useEffect, useState} from 'react';
import {Save, UserRound} from 'lucide-react';
import {api, message} from '../services/api';
import {dateTime} from '../utils/format';
import {PageTitle, Spinner, Status} from '../components/UI';

export default function Profile() {
    const [u, setU] = useState<any>(null), [note, setNote] = useState('');
    useEffect(() => {
        api.get('/users/profile').then(r => setU(r.data))
    }, []);
    if (!u) return <Spinner/>;

    async function save(e: any) {
        e.preventDefault();
        try {
            setU((await api.put('/users/profile', u)).data);
            setNote('Profile updated.')
        } catch (e) {
            setNote(message(e))
        }
    }

    return <><PageTitle title="මගේ පැතිකඩ" subtitle="Your stored profile information"/>
        <div className="grid max-w-4xl gap-4 md:grid-cols-[280px_1fr]">
            <div className="card h-fit text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-forest-50">
                    <UserRound size={36} className="text-forest-600"/></div>
                <h2 className="text-xl font-extrabold">{u.fullName}</h2><p
                className="text-sm text-slate-500">@{u.username}</p>
                <div className="mt-4"><Status value={u.status}/></div>
                <dl className="mt-5 border-t pt-4 text-left text-sm">
                    <dt className="text-slate-500">Role</dt>
                    <dd className="font-bold">{u.role}</dd>
                    <dt className="mt-3 text-slate-500">Last login</dt>
                    <dd className="font-bold">{dateTime(u.lastLogin)}</dd>
                </dl>
            </div>
            <form className="card" onSubmit={save}>{note &&
                <p className="mb-4 rounded-xl bg-forest-50 p-3 text-sm">{note}</p>}<h2
                className="mb-5 font-extrabold">Contact & profile</h2>
                <div
                    className="grid gap-4 sm:grid-cols-2">{[['phone', 'Phone'], ['email', 'Email'], ['address', 'Address']].map(([k, l]) =>
                    <label key={k}><span className="label">{l}</span><input className="input" value={u[k] || ''}
                                                                            onChange={e => setU({
                                                                                ...u,
                                                                                [k]: e.target.value
                                                                            })}/></label>)}</div>
                <label className="mt-4 block"><span className="label">Bio</span><textarea className="input" rows={4}
                                                                                          value={u.bio || ''}
                                                                                          onChange={e => setU({
                                                                                              ...u,
                                                                                              bio: e.target.value
                                                                                          })}/></label>
                <button className="btn-primary mt-6"><Save size={18}/>Update profile</button>
            </form>
        </div>
    </>
}
