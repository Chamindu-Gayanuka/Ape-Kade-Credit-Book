import {Router} from 'express';
import mongoose from 'mongoose';
import {authenticateUser, requireAdmin} from '../middleware/auth.js';
import {User} from '../models/User.js';
import {Customer} from '../models/Customer.js';
import {Category} from '../models/Category.js';
import {Transaction} from '../models/Transaction.js';
import {TransactionCorrection} from '../models/TransactionCorrection.js';
import {AuditLog} from '../models/AuditLog.js';
import {ShopSettings} from '../models/ShopSettings.js';
import {audit} from '../services/audit.js';
import {AppError, asyncHandler} from '../utils/http.js';

const router = Router();
router.use(authenticateUser, requireAdmin);

router.get('/export', asyncHandler(async (req, res) => {
    const [users, customers, categories, transactions, corrections, auditLogs, settings] = await Promise.all([
        User.find().select('-passwordHash').lean(), Customer.find().lean(), Category.find().lean(),
        Transaction.find().lean(), TransactionCorrection.find().lean(), AuditLog.find().lean(), ShopSettings.find().lean(),
    ]);
    const backup = {
        format: 'APE_KADE_BACKUP', version: 1, exportedAt: new Date().toISOString(),
        counts: {
            users: users.length,
            customers: customers.length,
            categories: categories.length,
            transactions: transactions.length,
            corrections: corrections.length,
            auditLogs: auditLogs.length,
            settings: settings.length
        },
        data: {users, customers, categories, transactions, corrections, auditLogs, settings},
    };
    await audit(req.user!.id, 'DATABASE_EXPORTED', 'Database', undefined, 'Database backup exported', backup.counts, req.ip);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ape-kade-backup-${stamp}.json"`);
    res.send(JSON.stringify(backup, null, 2));
}));

router.post('/import', asyncHandler(async (req, res) => {
    const backup = req.body;
    if (backup?.format !== 'APE_KADE_BACKUP' || backup?.version !== 1 || !backup?.data) {
        throw new AppError(400, 'Invalid Ape Kade backup file.');
    }
    const data = backup.data;
    const arrays = ['users', 'customers', 'categories', 'transactions', 'corrections', 'auditLogs', 'settings'];
    for (const key of arrays) if (!Array.isArray(data[key])) throw new AppError(400, `Backup section ${key} is invalid.`);

    const userMap = new Map<string, mongoose.Types.ObjectId>();
    for (const item of data.users) {
        if (!item.username) continue;
        const update: any = {
            fullName: item.fullName,
            phone: item.phone || '',
            email: item.email || '',
            address: item.address || '',
            bio: item.bio || '',
            status: item.status || 'ACTIVE',
            lastLogin: item.lastLogin || null
        };
        const user = await User.findOneAndUpdate({username: item.username}, {$set: update}, {new: true});
        if (user && item._id) userMap.set(String(item._id), user._id);
    }

    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const item of data.categories) {
        if (!item.name) continue;
        const category = await Category.findOneAndUpdate({name: item.name},
            {$set: {description: item.description || '', status: item.status || 'ACTIVE'}},
            {new: true, upsert: true, runValidators: true});
        if (item._id) categoryMap.set(String(item._id), category._id);
    }

    const customerMap = new Map<string, mongoose.Types.ObjectId>();
    for (const item of data.customers) {
        if (!item.customerCode || !item.name) continue;
        const customer = await Customer.findOneAndUpdate({customerCode: item.customerCode}, {
            $set: {
                name: item.name, phone: item.phone || '', nic: item.nic || '', address: item.address || '',
                notes: item.notes || '', status: item.status || 'ACTIVE',
            }
        }, {new: true, upsert: true, runValidators: true});
        if (item._id) customerMap.set(String(item._id), customer._id);
    }

    const transactionMap = new Map<string, mongoose.Types.ObjectId>();
    let importedTransactions = 0;
    for (const item of data.transactions) {
        const customerId = customerMap.get(String(item.customerId));
        const createdBy = userMap.get(String(item.createdBy)) || new mongoose.Types.ObjectId(req.user!.id);
        if (!item.transactionCode || !customerId) continue;
        const categoryId = item.categoryId ? categoryMap.get(String(item.categoryId)) || null : null;
        const transaction = await Transaction.findOneAndUpdate({transactionCode: item.transactionCode}, {
            $set: {
                customerId, transactionType: item.transactionType, categoryId, amountCents: item.amountCents,
                description: item.description || '', paymentMethod: item.paymentMethod || null,
                referenceNumber: item.referenceNumber || '', notes: item.notes || '', status: item.status || 'ACTIVE',
                createdBy, voidReason: item.voidReason || '', voidedBy: userMap.get(String(item.voidedBy)) || undefined,
                voidedAt: item.voidedAt || undefined, createdAt: item.createdAt, updatedAt: item.updatedAt,
            }
        }, {new: true, upsert: true, runValidators: true, timestamps: false});
        if (item._id) transactionMap.set(String(item._id), transaction._id);
        importedTransactions++;
    }

    let importedCorrections = 0;
    for (const item of data.corrections) {
        const originalTransactionId = transactionMap.get(String(item.originalTransactionId));
        const correctingTransactionId = transactionMap.get(String(item.correctingTransactionId));
        if (!originalTransactionId || !correctingTransactionId) continue;
        await TransactionCorrection.findOneAndUpdate({originalTransactionId, correctingTransactionId}, {
            $set: {
                reason: item.reason,
                correctedBy: userMap.get(String(item.correctedBy)) || new mongoose.Types.ObjectId(req.user!.id),
            }
        }, {upsert: true, runValidators: true});
        importedCorrections++;
    }

    if (data.settings[0]) {
        const setting = data.settings[0];
        await ShopSettings.findOneAndUpdate({}, {
            $set: {
                shopName: setting.shopName, address: setting.address,
                phone: setting.phone, currency: setting.currency, receiptFooter: setting.receiptFooter
            }
        }, {upsert: true});
    }

    let importedAuditLogs = 0;
    for (const item of data.auditLogs) {
        if (!item._id || !mongoose.isValidObjectId(item._id)) continue;
        const userId = userMap.get(String(item.userId));
        if (!userId) continue;
        await AuditLog.updateOne({_id: item._id}, {
            $setOnInsert: {
                userId, action: item.action,
                entityType: item.entityType, entityId: item.entityId, description: item.description,
                metadata: item.metadata || {}, ipAddress: item.ipAddress, createdAt: item.createdAt
            }
        }, {upsert: true});
        importedAuditLogs++;
    }

    const summary = {
        usersMerged: userMap.size, categoriesMerged: categoryMap.size,
        customersMerged: customerMap.size, transactionsMerged: importedTransactions,
        correctionsMerged: importedCorrections, auditLogsMerged: importedAuditLogs
    };
    await audit(req.user!.id, 'DATABASE_IMPORTED', 'Database', undefined, 'Database backup merged', summary, req.ip);
    res.json({message: 'Backup merged successfully.', summary});
}));

export default router;