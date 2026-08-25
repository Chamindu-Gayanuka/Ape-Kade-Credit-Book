import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {User} from '../models/User.js';
import {AppError, asyncHandler} from '../utils/http.js';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: 'ADMIN' | 'CASHIER'; username: string }
        }
    }
}
export const authenticateUser = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new AppError(401, 'Authentication required.');
    let p: any;
    try {
        p = jwt.verify(token, env.JWT_SECRET)
    } catch {
        throw new AppError(401, 'Session expired. Please login again.')
    }
    const user = await User.findById(p.sub).lean();
    if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Authentication required.');
    req.user = {id: String(user._id), role: user.role as any, username: user.username};
    next()
});
export const requireAdmin = (req: Request, _: Response, next: NextFunction) => req.user?.role === 'ADMIN' ? next() : next(new AppError(403, 'Insufficient permission.'));
export const requireCashierOrAdmin = (req: Request, _: Response, next: NextFunction) => req.user ? next() : next(new AppError(401, 'Authentication required.'));
