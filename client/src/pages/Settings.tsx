import {useEffect, useState} from 'react';
import {Save} from 'lucide-react';
import {api, message} from '../services/api';
import {PageTitle, Spinner} from '../components/UI';

export default function Settings() {
    const [s, setS] = useState<any>(null), [note, setNote] = useState('');
    useEffect(() => {
        api.get('/settings').then(r => setS(r.data))
    }, []);
    if (!s) return <Spinner/>;

    async function save(e: any) {
        e.preventDefault();
        try {
            const {data} = await api.put('/settings', s);
            setS(data);
            setNote('Settings saved successfully.')
        } catch (e) {
            setNote(message(e))
        }
    }

    return <><PageTitle title="සැකසුම්" subtitle="Shop and receipt configuration"/>
        <form onSubmit={save} className="card max-w-2xl">{note &&
            <div className="mb-4 rounded-xl bg-forest-50 p-3 text-sm text-forest-700">{note}</div>}
            <div
                className="grid gap-4 sm:grid-cols-2">{[['shopName', 'Shop Name'], ['phone', 'Phone Number'], ['address', 'Address'], ['currency', 'Currency']].map(([k, l]) =>
                <label key={k}><span className="label">{l}</span><input className="input" value={s[k] || ''}
                                                                        onChange={e => setS({
                                                                            ...s,
                                                                            [k]: e.target.value
                                                                        })}/></label>)}</div>
            <label className="mt-4 block"><span className="label">Receipt Footer</span><textarea className="input"
                                                                                                 value={s.receiptFooter || ''}
                                                                                                 onChange={e => setS({
                                                                                                     ...s,
                                                                                                     receiptFooter: e.target.value
                                                                                                 })}/></label>
            <button className="btn-primary mt-6"><Save size={18}/>Save settings</button>
        </form>
    </>
}
