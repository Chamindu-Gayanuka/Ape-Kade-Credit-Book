import {Router} from 'express';
import mongoose, {type ClientSession} from 'mongoose';
import {Transaction} from '../models/Transaction.js';
import {TransactionCorrection} from '../models/TransactionCorrection.js';
import {Customer} from '../models/Customer.js';
import {Category} from '../models/Category.js';
import {authenticateUser, requireAdmin} from '../middleware/auth.js';
import {audit} from '../services/audit.js';
import {amountView, balanceCents} from '../services/balance.js';
import {runAtomic} from '../services/atomic.js';
import {AppError, asyncHandler, cents, pageParams} from '../utils/http.js';

const router = Router();
router.use(authenticateUser);
const code = () => `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const createFinancial = (type: 'CREDIT' | 'PAYMENT') => asyncHandler(async (req, res) => {
    const {
        customerId, categoryId, amount, description = '', paymentMethod = null,
        referenceNumber = '', notes = '',
    } = req.body;
    if (!mongoose.isValidObjectId(customerId)) throw new AppError(400, 'Invalid customer.');
    const amountCents = cents(amount);

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError(404, 'Customer not found.');
    if (customer.status !== 'ACTIVE') throw new AppError(400, 'Customer is inactive.');
    if (type === 'CREDIT') {
        if (!mongoose.isValidObjectId(categoryId) || !await Category.exists({_id: categoryId, status: 'ACTIVE'})) {
            throw new AppError(400, 'Valid category is required.');
        }
    }
    if (type === 'PAYMENT' && !['Cash', 'Bank Transfer', 'Other'].includes(paymentMethod)) {
        throw new AppError(400, 'Valid payment method is required.');
    }

    let createdId = '';
    let previousBalanceCents = 0;
    await runAtomic(async (session?: ClientSession) => {
        // Touching the customer in replica-set mode serializes concurrent payments for
        // the same customer and prevents two simultaneous payments from overpaying.
        if (session) {
            await Customer.updateOne({_id: customerId}, {$set: {updatedAt: new Date()}}, {session});
        }
        previousBalanceCents = await balanceCents(customerId, session);
        if (type === 'PAYMENT' && amountCents > previousBalanceCents) {
            throw new AppError(400, 'Payment exceeds outstanding balance.');
        }

        let created: any;
        try {
            [created] = await Transaction.create([{
                transactionCode: code(), customerId, transactionType: type,
                categoryId: type === 'CREDIT' ? categoryId : null,
                amountCents, description,
                paymentMethod: type === 'PAYMENT' ? paymentMethod : null,
                referenceNumber, notes, createdBy: req.user!.id,
            }], session ? {session} : {});
            createdId = String(created._id);
            await audit(
                req.user!.id, type === 'CREDIT' ? 'CREDIT_CREATED' : 'PAYMENT_CREATED',
                'Transaction', created._id, `${type} ${created.transactionCode} created`,
                {amount: amountCents / 100, customerId}, req.ip, session,
            );
        } catch (error) {
            // On standalone MongoDB, compensate if audit creation fails. This record was
            // never finalized or returned to a user, so no financial history is lost.
            if (!session && created?._id) await Transaction.deleteOne({_id: created._id});
            throw error;
        }
    });

    const remainingBalanceCents = type === 'CREDIT'
        ? previousBalanceCents + amountCents
        : previousBalanceCents - amountCents;
    const populated = await Transaction.findById(createdId)
        .populate('customerId', 'name customerCode')
        .populate('categoryId', 'name')
        .populate('createdBy', 'fullName')
        .lean();
    if (!populated) throw new AppError(500, 'Transaction was saved but could not be loaded.');
    res.status(201).json({
        ...amountView(populated),
        previousBalance: previousBalanceCents / 100,
        remainingBalance: remainingBalanceCents / 100,
    });
});

router.post('/credit', createFinancial('CREDIT'));
router.post('/payment', createFinancial('PAYMENT'));

router.get('/', asyncHandler(async (req, res) => {
    const {page, limit} = pageParams(req.query);
    const query: any = {};
    for (const key of ['customerId', 'transactionType', 'status', 'categoryId', 'createdBy']) {
        if (req.query[key]) query[key] = req.query[key];
    }
    if (req.query.from || req.query.to) {
        query.createdAt = {};
        if (req.query.from) query.createdAt.$gte = new Date(String(req.query.from));
        if (req.query.to) {
            const date = new Date(String(req.query.to));
            date.setHours(23, 59, 59, 999);
            query.createdAt.$lte = date;
        }
    }
    const search = String(req.query.search || '').trim();
    if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            {transactionCode: {$regex: safe, $options: 'i'}},
            {description: {$regex: safe, $options: 'i'}},
            {referenceNumber: {$regex: safe, $options: 'i'}},
        ];
    }
    const [items, total] = await Promise.all([
        Transaction.find(query)
            .populate('customerId', 'name customerCode').populate('categoryId', 'name')
            .populate('createdBy', 'fullName username').sort({createdAt: -1})
            .skip((page - 1) * limit).limit(limit).lean(),
        Transaction.countDocuments(query),
    ]);
    res.json({items: items.map(amountView), page, limit, total, pages: Math.ceil(total / limit)});
}));

router.get('/:id', asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid transaction ID.');
    const transaction = await Transaction.findById(req.params.id)
        .populate('customerId').populate('categoryId').populate('createdBy', 'fullName username').lean();
    if (!transaction) throw new AppError(404, 'Transaction not found.');
    res.json(amountView(transaction));
}));

router.post('/:id/void', requireAdmin, asyncHandler(async (req, res) => {
    if (!req.body.reason?.trim()) throw new AppError(400, 'Void reason is required.');
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid transaction ID.');
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) throw new AppError(404, 'Transaction not found.');
    if (transaction.status !== 'ACTIVE') throw new AppError(400, 'Transaction has already been voided or corrected.');

    const old = {
        status: transaction.status, voidReason: transaction.voidReason,
        voidedBy: transaction.voidedBy, voidedAt: transaction.voidedAt,
    };
    await runAtomic(async session => {
        transaction.status = 'VOID';
        transaction.voidReason = req.body.reason.trim();
        transaction.voidedBy = new mongoose.Types.ObjectId(req.user!.id);
        transaction.voidedAt = new Date();
        try {
            await transaction.save(session ? {session} : {});
            await audit(
                req.user!.id, 'TRANSACTION_VOIDED', 'Transaction', transaction._id,
                `Transaction ${transaction.transactionCode} voided`,
                {reason: transaction.voidReason}, req.ip, session,
            );
        } catch (error) {
            if (!session) {
                Object.assign(transaction, old);
                await transaction.save();
            }
            throw error;
        }
    });
    res.json(amountView(transaction.toObject()));
}));

router.post('/:id/correct', requireAdmin, asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid transaction ID.');
    const original = await Transaction.findById(req.params.id);
    if (!original) throw new AppError(404, 'Transaction not found.');
    if (original.status !== 'ACTIVE') throw new AppError(400, 'Cannot modify a finalized transaction.');
    const {reason, amount, description, categoryId, paymentMethod, referenceNumber} = req.body;
    if (!reason?.trim()) throw new AppError(400, 'Correction reason is required.');
    const correctedAmount = cents(amount);
    const old = {
        status: original.status, voidReason: original.voidReason,
        voidedBy: original.voidedBy, voidedAt: original.voidedAt,
    };
    let correctingId = '';

    await runAtomic(async session => {
        let correcting: any;
        let correction: any;
        try {
            original.status = 'CORRECTED';
            original.voidReason = reason.trim();
            original.voidedBy = new mongoose.Types.ObjectId(req.user!.id);
            original.voidedAt = new Date();
            await original.save(session ? {session} : {});
            [correcting] = await Transaction.create([{
                transactionCode: code(), customerId: original.customerId,
                transactionType: original.transactionType,
                categoryId: categoryId ?? original.categoryId, amountCents: correctedAmount,
                description: description ?? original.description,
                paymentMethod: paymentMethod ?? original.paymentMethod,
                referenceNumber: referenceNumber ?? original.referenceNumber,
                createdBy: req.user!.id,
            }], session ? {session} : {});
            correctingId = String(correcting._id);
            [correction] = await TransactionCorrection.create([{
                originalTransactionId: original._id, correctingTransactionId: correcting._id,
                reason: reason.trim(), correctedBy: req.user!.id,
            }], session ? {session} : {});
            await audit(
                req.user!.id, 'TRANSACTION_CORRECTED', 'Transaction', original._id,
                `Transaction ${original.transactionCode} corrected`,
                {correctingTransactionId: correcting._id, reason}, req.ip, session,
            );
        } catch (error) {
            if (!session) {
                if (correction?._id) await TransactionCorrection.deleteOne({_id: correction._id});
                if (correcting?._id) await Transaction.deleteOne({_id: correcting._id});
                Object.assign(original, old);
                await original.save();
            }
            throw error;
        }
    });

    const correcting = await Transaction.findById(correctingId).lean();
    if (!correcting) throw new AppError(500, 'Correcting transaction could not be loaded.');
    res.status(201).json(amountView(correcting));
}));

export default router;
