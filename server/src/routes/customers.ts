import {Router} from 'express';
import {Customer} from '../models/Customer.js';
import {Transaction} from '../models/Transaction.js';
import {authenticateUser} from '../middleware/auth.js';
import {audit} from '../services/audit.js';
import {balanceCents, amountView} from '../services/balance.js';
import {AppError, asyncHandler, pageParams} from '../utils/http.js';

const r = Router();
r.use(authenticateUser);
r.get('/', asyncHandler(async (req, res) => {
    const {page, limit} = pageParams(req.query), search = String(req.query.search || '').trim(),
        status = String(req.query.status || '');
    const q: any = {};
    if (status) q.status = status;
    if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        q.$or = ['name', 'phone', 'nic', 'customerCode'].map(k => ({[k]: {$regex: safe, $options: 'i'}}))
    }
    const [items, total] = await Promise.all([Customer.find(q).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).lean(), Customer.countDocuments(q)]);
    const ids = items.map(x => x._id);
    const sums = await Transaction.aggregate([{
        $match: {
            customerId: {$in: ids},
            status: 'ACTIVE'
        }
    }, {
        $group: {
            _id: '$customerId',
            balance: {$sum: {$cond: [{$eq: ['$transactionType', 'PAYMENT']}, {$multiply: ['$amountCents', -1]}, '$amountCents']}}
        }
    }]);
    const map = new Map(sums.map(x => [String(x._id), x.balance / 100]));
    res.json({
        items: items.map(x => ({...x, outstandingBalance: map.get(String(x._id)) || 0})),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    })
}));
r.post('/', asyncHandler(async (req, res) => {
    const {name, phone = '', nic = '', address = '', notes = ''} = req.body;
    if (!name?.trim()) throw new AppError(400, 'Customer name is required.');
    const last = await Customer.findOne().sort({createdAt: -1}).lean();
    const n = last ? Number(last.customerCode.replace(/\D/g, '')) + 1 : 1;
    const c = await Customer.create({
        customerCode: `CUS-${String(n).padStart(5, '0')}`,
        name: name.trim(),
        phone,
        nic,
        address,
        notes
    });
    await audit(req.user!.id, 'CUSTOMER_CREATED', 'Customer', c._id, `Customer ${c.customerCode} created`, {}, req.ip);
    res.status(201).json(c)
}));
r.get('/:id', asyncHandler(async (req, res) => {
    const c = await Customer.findById(req.params.id).lean();
    if (!c) throw new AppError(404, 'Customer not found.');
    res.json({...c, outstandingBalance: (await balanceCents(c._id)) / 100})
}));
r.put('/:id', asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'nic', 'address', 'notes', 'status'];
    const data: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    const c = await Customer.findByIdAndUpdate(req.params.id, data, {new: true, runValidators: true});
    if (!c) throw new AppError(404, 'Customer not found.');
    await audit(req.user!.id, 'CUSTOMER_UPDATED', 'Customer', c._id, `Customer ${c.customerCode} updated`, {}, req.ip);
    res.json(c)
}));
r.get('/:id/transactions', asyncHandler(async (req, res) => {
    const {page, limit} = pageParams(req.query);
    const q = {customerId: req.params.id};
    const [items, total] = await Promise.all([Transaction.find(q).populate('categoryId', 'name').populate('createdBy', 'fullName username').sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).lean(), Transaction.countDocuments(q)]);
    res.json({items: items.map(amountView), page, total, pages: Math.ceil(total / limit)})
}));
r.get('/:id/balance', asyncHandler(async (req, res) => {
    if (!await Customer.exists({_id: req.params.id})) throw new AppError(404, 'Customer not found.');
    res.json({balance: (await balanceCents(String(req.params.id))) / 100})
}));
export default r;
