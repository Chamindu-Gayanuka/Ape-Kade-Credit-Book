import {useEffect, useRef, useState} from 'react';
import {Database, Download, LoaderCircle, Save, Upload} from 'lucide-react';
import {api, message} from '../services/api';
import {PageTitle, Spinner} from '../components/UI';

export default function Settings() {
    const [settings, setSettings] = useState<any>(null);
    const [note, setNote] = useState('');
    const [backupBusy, setBackupBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        api.get('/settings').then(response => setSettings(response.data));
    }, []);
    if (!settings) return <Spinner/>;

    async function save(event: React.FormEvent) {
        event.preventDefault();
        try {
            const {data} = await api.put('/settings', settings);
            setSettings(data);
            setNote('Settings saved successfully.');
        } catch (error) {
            setNote(message(error));
        }
    }

    async function exportDatabase() {
        setBackupBusy(true);
        setNote('');
        try {
            const response = await api.get('/backup/export', {responseType: 'blob'});
            const disposition = response.headers['content-disposition'] || '';
            const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] || `ape-kade-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
            setNote('Database backup exported.');
        } catch (error) {
            setNote(message(error));
        } finally {
            setBackupBusy(false);
        }
    }

    async function importDatabase(file?: File) {
        if (!file) return;
        if (!confirm('Merge this backup into the current database? Existing matching records will be updated.')) {
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        setBackupBusy(true);
        setNote('');
        try {
            const json = JSON.parse(await file.text());
            const {data} = await api.post('/backup/import', json);
            setNote(`${data.message} Customers: ${data.summary.customersMerged}, transactions: ${data.summary.transactionsMerged}.`);
        } catch (error) {
            setNote(error instanceof SyntaxError ? 'The selected file is not valid JSON.' : message(error));
        } finally {
            setBackupBusy(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    return <><PageTitle title="සැකසුම්" subtitle="Shop configuration and Admin database tools"/>
        <form onSubmit={save} className="card max-w-2xl">{note &&
            <div className="mb-4 rounded-xl bg-forest-50 p-3 text-sm text-forest-700">{note}</div>}<h2
            className="mb-5 font-extrabold">Shop settings</h2>
            <div
                className="grid gap-4 sm:grid-cols-2">{[['shopName', 'Shop Name'], ['phone', 'Phone Number'], ['address', 'Address'], ['currency', 'Currency']].map(([key, label]) =>
                <label key={key}><span className="label">{label}</span><input className="input"
                                                                              value={settings[key] || ''}
                                                                              onChange={event => setSettings({
                                                                                  ...settings,
                                                                                  [key]: event.target.value
                                                                              })}/></label>)}</div>
            <label className="mt-4 block"><span className="label">Receipt Footer</span><textarea className="input"
                                                                                                 value={settings.receiptFooter || ''}
                                                                                                 onChange={event => setSettings({
                                                                                                     ...settings,
                                                                                                     receiptFooter: event.target.value
                                                                                                 })}/></label>
            <button className="btn-primary mt-6"><Save size={18}/>Save settings</button>
        </form>
        <div className="card mt-4 max-w-2xl border-blue-200">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Database/></div>
                <div><h2 className="font-extrabold">Database import / export</h2><p
                    className="mt-1 text-sm text-slate-500">Admin-only JSON backup. Export excludes password hashes.
                    Import safely merges records by username, category name, customer code and transaction code.</p>
                </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn-primary" disabled={backupBusy} onClick={exportDatabase}>{backupBusy ?
                    <LoaderCircle size={17} className="animate-spin"/> : <Download size={17}/>}Export database
                </button>
                <button className="btn-secondary" disabled={backupBusy} onClick={() => fileRef.current?.click()}><Upload
                    size={17}/>Import and merge
                </button>
                <input ref={fileRef} type="file" className="hidden" accept="application/json,.json"
                       onChange={event => importDatabase(event.target.files?.[0])}/></div>
            <p className="mt-4 text-xs text-amber-700">Keep backup files secure. Imports cannot restore passwords;
                existing account credentials remain unchanged.</p></div>
    </>;
}