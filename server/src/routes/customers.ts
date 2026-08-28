import {Router} from 'express';
import {Customer} from '../models/Customer.js';
import {Transaction} from '../models/Transaction.js';
import {authenticateUser} from '../middleware/auth.js';
import {audit} from '../services/audit.js';
import {balanceCents, amountView} from '../services/balance.js';
import {AppError, asyncHandler, pageParams} from '../utils/http.js';

const router = Router();
router.use(authenticateUser);

router.get('/', asyncHandler(async (req, res) => {
    const {page, limit} = pageParams(req.query);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '');
    const query: any = {};
    if (status) query.status = status;
    if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = ['name', 'phone', 'nic', 'customerCode'].map(key => ({
            [key]: {$regex: safe, $options: 'i'},
        }));
    }

    const [items, total] = await Promise.all([
        Customer.find(query).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).lean(),
        Customer.countDocuments(query),
    ]);
    const ids = items.map(item => item._id);
    const sums = await Transaction.aggregate([
        {$match: {customerId: {$in: ids}, status: 'ACTIVE'}},
        {
            $group: {
                _id: '$customerId',
                balance: {
                    $sum: {
                        $cond: [
                            {$eq: ['$transactionType', 'PAYMENT']},
                            {$multiply: ['$amountCents', -1]},
                            '$amountCents',
                        ]
                    }
                },
            }
        },
    ]);
    const balanceMap = new Map(sums.map(item => [String(item._id), item.balance]));

    res.json({
        items: items.map(item => {
            const ledgerCents = balanceMap.get(String(item._id)) || 0;
            return {
                ...item,
                outstandingBalance: Math.max(0, ledgerCents) / 100,
                advanceBalance: Math.max(0, -ledgerCents) / 100,
                ledgerBalance: ledgerCents / 100,
            };
        }),
        page, limit, total, pages: Math.ceil(total / limit),
    });
}));

router.post('/', asyncHandler(async (req, res) => {
    const {name, phone = '', nic = '', address = '', notes = ''} = req.body;
    if (!name?.trim()) throw new AppError(400, 'Customer name is required.');
    const last = await Customer.findOne().sort({createdAt: -1}).lean();
    const nextNumber = last ? Number(last.customerCode.replace(/\D/g, '')) + 1 : 1;
    const customer = await Customer.create({
        customerCode: `CUS-${String(nextNumber).padStart(5, '0')}`,
        name: name.trim(), phone, nic, address, notes,
    });
    await audit(
        req.user!.id, 'CUSTOMER_CREATED', 'Customer', customer._id,
        `Customer ${customer.customerCode} created`, {}, req.ip,
    );
    res.status(201).json({
        ...customer.toObject(), outstandingBalance: 0, advanceBalance: 0, ledgerBalance: 0,
    });
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw new AppError(404, 'Customer not found.');
    const ledgerCents = await balanceCents(customer._id);
    res.json({
        ...customer,
        outstandingBalance: Math.max(0, ledgerCents) / 100,
        advanceBalance: Math.max(0, -ledgerCents) / 100,
        ledgerBalance: ledgerCents / 100,
    });
}));

router.put('/:id', asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'nic', 'address', 'notes', 'status'];
    const update: any = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    const customer = await Customer.findByIdAndUpdate(
        req.params.id, update, {new: true, runValidators: true},
    );
    if (!customer) throw new AppError(404, 'Customer not found.');
    await audit(
        req.user!.id, 'CUSTOMER_UPDATED', 'Customer', customer._id,
        `Customer ${customer.customerCode} updated`, {}, req.ip,
    );
    res.json(customer);
}));

router.get('/:id/transactions', asyncHandler(async (req, res) => {
    const {page, limit} = pageParams(req.query);
    const query = {customerId: req.params.id};
    const [items, total] = await Promise.all([
        Transaction.find(query).populate('categoryId', 'name')
            .populate('createdBy', 'fullName username').sort({createdAt: -1})
            .skip((page - 1) * limit).limit(limit).lean(),
        Transaction.countDocuments(query),
    ]);
    res.json({items: items.map(amountView), page, total, pages: Math.ceil(total / limit)});
}));

router.get('/:id/balance', asyncHandler(async (req, res) => {
    if (!await Customer.exists({_id: req.params.id})) throw new AppError(404, 'Customer not found.');
    const ledgerCents = await balanceCents(String(req.params.id));
    res.json({
        outstandingBalance: Math.max(0, ledgerCents) / 100,
        advanceBalance: Math.max(0, -ledgerCents) / 100,
        ledgerBalance: ledgerCents / 100,
    });
}));

export default router;