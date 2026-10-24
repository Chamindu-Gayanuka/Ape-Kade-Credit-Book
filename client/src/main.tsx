import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);

if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    } else {
        navigator.serviceWorker.getRegistrations().then(registrations =>
            registrations.forEach(registration => registration.unregister()),
        );
        if ('caches' in window) {
            caches.keys().then(keys => Promise.all(
                keys.filter(key => key.startsWith('ape-kade-')).map(key => caches.delete(key)),
            ));
        }
    }
}