import app from './app.js';
import {connectDB} from './config/db.js';
import {env} from './config/env.js';

connectDB().then(() => {
    const server = app.listen(env.PORT, '0.0.0.0', () => console.log(`API listening on ${env.PORT}`));
    const stop = () => server.close(() => process.exit(0));
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop)
}).catch(e => {
    console.error('Database connection failed', e.message);
    process.exit(1)
});
