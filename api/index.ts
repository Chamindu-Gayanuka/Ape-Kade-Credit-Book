import app from '../server/src/app.js';
import {connectDB} from '../server/src/config/db.js';

export default async function handler(req: any, res: any) {
    try {
        await connectDB();
        return app(req, res);
    } catch (error) {
        console.error('Serverless database connection failed:', error);
        if (!res.headersSent) {
            return res.status(503).json({message: 'Database service is temporarily unavailable.'});
        }
    }
}
