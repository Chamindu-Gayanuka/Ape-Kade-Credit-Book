import {Router} from 'express';
import {authenticateUser} from '../middleware/auth.js';
import {Transaction} from '../models/Transaction.js';
import {Customer} from '../models/Customer.js';
import {Category} from '../models/Category.js';
import {asyncHandler} from '../utils/http.js';

const r = Router();
r.use(authenticateUser);
const period = async (start: Date, end: Date) => {
    const rows = await Transaction.aggregate([{
        $match: {
            status: 'ACTIVE',
            createdAt: {$gte: start, $lte: end}
        }
    }, {$group: {_id: '$transactionType', total: {$sum: '$amountCents'}, count: {$sum: 1}}}]);
    const get = (x: string) => rows.find(r => r._id === x) || {total: 0, count: 0};
    return {
        totalCredit: get('CREDIT').total / 100,
        totalPayments: get('PAYMENT').total / 100,
        netCredit: (get('CREDIT').total - get('PAYMENT').total) / 100,
        creditCount: get('CREDIT').count,
        paymentCount: get('PAYMENT').count
    }
};
r.get('/daily', asyncHandler(async (req, res) => {
    const d = req.query.date ? new Date(String(req.query.date)) : new Date();
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()), e = new Date(s);
    e.setHours(23, 59, 59, 999);
    res.json(await period(s, e))
}));
r.get('/monthly', asyncHandler(async (req, res) => {
    const d = req.query.month ? new Date(`${req.query.month}-01`) : new Date();
    const s = new Date(d.getFullYear(), d.getMonth(), 1),
        e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const base = await period(s, e);
    const balances = await Transaction.aggregate([{$match: {status: 'ACTIVE'}}, {
        $group: {
            _id: '$customerId',
            b: {$sum: {$cond: [{$eq: ['$transactionType', 'PAYMENT']}, {$multiply: ['$amountCents', -1]}, '$amountCents']}}
        }
    }, {$match: {b: {$gt: 0}}}, {$group: {_id: null, total: {$sum: '$b'}, count: {$sum: 1}}}]);
    res.json({...base, outstanding: (balances[0]?.total || 0) / 100, activeDebtors: balances[0]?.count || 0})
}));
r.get('/category', asyncHandler(async (_q, res) => {
    const rows = await Category.aggregate([{
        $lookup: {
            from: 'transactions',
            let: {id: '$_id'},
            pipeline: [{$match: {$expr: {$and: [{$eq: ['$categoryId', '$$id']}, {$eq: ['$transactionType', 'CREDIT']}, {$eq: ['$status', 'ACTIVE']}]}}}, {
                $group: {
                    _id: null,
                    count: {$sum: 1},
                    total: {$sum: '$amountCents'}
                }
            }],
            as: 'r'
        }
    }, {
        $project: {
            name: 1,
            count: {$ifNull: [{$first: '$r.count'}, 0]},
            total: {$divide: [{$ifNull: [{$first: '$r.total'}, 0]}, 100]}
        }
    }]);
    res.json(rows)
}));
r.get('/customers', asyncHandler(async (req, res) => {
    const sort = String(req.query.sort || 'highest');
    const rows = await Customer.aggregate([{
        $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'customerId',
            as: 'tx'
        }
    }, {
        $addFields: {
            outstandingBalance: {
                $divide: [{
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$tx',
                                    as: 't',
                                    cond: {$eq: ['$$t.status', 'ACTIVE']}
                                }
                            },
                            as: 't',
                            in: {$cond: [{$eq: ['$$t.transactionType', 'PAYMENT']}, {$multiply: ['$$t.amountCents', -1]}, '$$t.amountCents']}
                        }
                    }
                }, 100]
            }, recentActivity: {$max: '$tx.createdAt'}
        }
    }, {$project: {tx: 0}}, {$sort: sort === 'lowest' ? {outstandingBalance: 1} : sort === 'recent' ? {recentActivity: -1} : {outstandingBalance: -1}}, {$limit: 100}]);
    res.json(rows)
}));
export default r;
