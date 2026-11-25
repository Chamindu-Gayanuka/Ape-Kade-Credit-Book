import {Router} from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import {User} from '../models/User.js';
import {AuditLog} from '../models/AuditLog.js';
import {authenticateUser, requireAdmin} from '../middleware/auth.js';
import {audit} from '../services/audit.js';
import {AppError, asyncHandler, pageParams} from '../utils/http.js';

const r = Router();
// Limit before authentication, which also performs a database lookup.
const activityLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {message: 'Too many activity requests. Please try again later.'}
});
r.get('/:id/activity', activityLimiter, authenticateUser, requireAdmin, asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new AppError(400, 'Invalid user id');
    }
    const userId = new mongoose.Types.ObjectId(id);
    res.json(await AuditLog.find({userId}).sort({createdAt: -1}).limit(100));
}));
r.use(authenticateUser);
const fields = 'username fullName role phone email address bio status lastLogin createdAt updatedAt';
r.get('/profile', asyncHandler(async (req, res) => res.json(await User.findById(req.user!.id).select(fields))));
r.put('/profile', asyncHandler(async (req, res) => {
    const allowed = ['phone', 'email', 'address', 'bio'];
    const data: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    res.json(await User.findByIdAndUpdate(req.user!.id, data, {new: true, runValidators: true}).select(fields))
}));
r.use(requireAdmin);
r.get('/', asyncHandler(async (req, res) => {
    const {page, limit} = pageParams(req.query);
    const [items, total] = await Promise.all([User.find().select(fields).sort({createdAt: 1}).skip((page - 1) * limit).limit(limit), User.countDocuments()]);
    res.json({items, page, total, pages: Math.ceil(total / limit)})
}));
r.get('/:id', asyncHandler(async (req, res) => {
    const u = await User.findById(req.params.id).select(fields);
    if (!u) throw new AppError(404, 'User not found.');
    res.json(u)
}));
r.put('/:id', asyncHandler(async (req, res) => {
    const allowed = ['fullName', 'phone', 'email', 'address', 'bio'];
    const data: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    const u = await User.findByIdAndUpdate(req.params.id, data, {new: true, runValidators: true}).select(fields);
    if (!u) throw new AppError(404, 'User not found.');
    await audit(req.user!.id, 'USER_UPDATED', 'User', u._id, `User ${u.username} updated`, {}, req.ip);
    res.json(u)
}));
r.post('/:id/change-password', asyncHandler(async (req, res) => {
    if (typeof req.body.password !== 'string' || req.body.password.length < 10) throw new AppError(400, 'Password must contain at least 10 characters.');
    const u = await User.findById(req.params.id);
    if (!u) throw new AppError(404, 'User not found.');
    u.passwordHash = await bcrypt.hash(req.body.password, 12);
    await u.save();
    await audit(req.user!.id, 'PASSWORD_CHANGED', 'User', u._id, `Password changed for ${u.username}`, {}, req.ip);
    res.json({message: 'Password changed successfully.'})
}));
const status = (value: string, action: string) => asyncHandler(async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) throw new AppError(404, 'User not found.');
    if (value === 'INACTIVE' && u.role === 'ADMIN' && await User.countDocuments({
        role: 'ADMIN',
        status: 'ACTIVE'
    }) <= 1) throw new AppError(400, 'Cannot deactivate the only active administrator.');
    u.status = value as any;
    await u.save();
    await audit(req.user!.id, action, 'User', u._id, `User ${u.username} ${value.toLowerCase()}`, {}, req.ip);
    res.json(u)
});
r.post('/:id/deactivate', status('INACTIVE', 'USER_DEACTIVATED'));
r.post('/:id/activate', status('ACTIVE', 'USER_ACTIVATED'));
export default r;