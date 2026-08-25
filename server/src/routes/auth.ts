import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import {User} from '../models/User.js';
import {AuditLog} from '../models/AuditLog.js';
import {env} from '../config/env.js';
import {authenticateUser} from '../middleware/auth.js';
import {AppError, asyncHandler} from '../utils/http.js';

const r = Router();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {message: 'Too many login attempts. Please try again later.'}
});
const publicUser = (u: any) => ({
    id: u._id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    phone: u.phone,
    email: u.email,
    address: u.address,
    bio: u.bio,
    status: u.status,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt
});
r.post('/login', limiter, asyncHandler(async (req, res) => {
    const {username, password} = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') throw new AppError(400, 'Username and password are required.');
    const u = await User.findOne({username}).select('+passwordHash');
    if (!u || u.status !== 'ACTIVE' || !await bcrypt.compare(password, u.passwordHash)) throw new AppError(401, 'Invalid username or password.');
    u.lastLogin = new Date();
    await u.save();
    const token = jwt.sign({sub: String(u._id), role: u.role}, env.JWT_SECRET, {expiresIn: env.JWT_EXPIRES_IN as any});
    res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000
    });
    await AuditLog.create({
        userId: u._id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: u._id,
        description: 'User logged in',
        ipAddress: req.ip
    });
    res.json({user: publicUser(u)})
}));
r.post('/logout', authenticateUser, asyncHandler(async (req, res) => {
    await AuditLog.create({
        userId: req.user!.id,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user!.id,
        description: 'User logged out',
        ipAddress: req.ip
    });
    res.clearCookie('token');
    res.json({message: 'Logged out.'})
}));
r.get('/me', authenticateUser, asyncHandler(async (req, res) => {
    const u = await User.findById(req.user!.id);
    res.json({user: publicUser(u)})
}));
export default r;
