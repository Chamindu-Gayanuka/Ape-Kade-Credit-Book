import {Router} from 'express';
import {Types} from 'mongoose';
import {authenticateUser} from '../middleware/auth.js';
import {Customer} from '../models/Customer.js';
import {Transaction} from '../models/Transaction.js';
import {Category} from '../models/Category.js';
import {asyncHandler} from '../utils/http.js';

const r = Router();
r.use(authenticateUser);
r.get('/', asyncHandler(async (_q, res) => {
    const now = new Date(), day = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        month = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalCustomers, bals, today, monthly, cats] = await Promise.all([Customer.countDocuments({status: 'ACTIVE'}), Transaction.aggregate([{$match: {status: 'ACTIVE'}}, {
        $group: {
            _id: '$customerId',
            balance: {$sum: {$cond: [{$eq: ['$transactionType', 'PAYMENT']}, {$multiply: ['$amountCents', -1]}, '$amountCents']}}
        }
    }, {$match: {balance: {$gt: 0}}}, {
        $group: {
            _id: null,
            total: {$sum: '$balance'},
            customers: {$sum: 1}
        }
    }]), Transaction.aggregate([{$match: {status: 'ACTIVE', createdAt: {$gte: day}}}, {
        $group: {
            _id: '$transactionType',
            total: {$sum: '$amountCents'}
        }
    }]), Transaction.aggregate([{
        $match: {
            status: 'ACTIVE',
            createdAt: {$gte: month}
        }
    }, {
        $group: {
            _id: '$transactionType',
            total: {$sum: '$amountCents'}
        }
    }]), Category.aggregate([{
        $lookup: {
            from: 'transactions',
            let: {cid: '$_id'},
            pipeline: [{$match: {$expr: {$and: [{$eq: ['$categoryId', '$$cid']}, {$eq: ['$status', 'ACTIVE']}, {$eq: ['$transactionType', 'CREDIT']}]}}}, {
                $group: {
                    _id: null,
                    total: {$sum: '$amountCents'}
                }
            }],
            as: 's'
        }
    }, {$project: {name: 1, total: {$ifNull: [{$first: '$s.total'}, 0]}}}])]);
    const val = (a: any[], k: string) => (a.find(x => x._id === k)?.total || 0) / 100;
    res.json({
        totalCustomers,
        customersWithOutstanding: bals[0]?.customers || 0,
        totalOutstanding: (bals[0]?.total || 0) / 100,
        todayCredit: val(today, 'CREDIT'),
        todayPayments: val(today, 'PAYMENT'),
        monthCredit: val(monthly, 'CREDIT'),
        monthPayments: val(monthly, 'PAYMENT'),
        categories: cats.map(x => ({name: x.name, total: x.total / 100}))
    })
}));
export default r;
