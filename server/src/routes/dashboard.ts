import {Router} from 'express';
import {authenticateUser} from '../middleware/auth.js';
import {Customer} from '../models/Customer.js';
import {Transaction} from '../models/Transaction.js';
import {Category} from '../models/Category.js';
import {asyncHandler} from '../utils/http.js';

const router = Router();
router.use(authenticateUser);

router.get('/', asyncHandler(async (_req, res) => {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCustomers, balanceSummary, today, monthly, categories, customerBalances] = await Promise.all([
        Customer.countDocuments({status: 'ACTIVE'}),
        Transaction.aggregate([
            {$match: {status: 'ACTIVE'}},
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
            {
                $group: {
                    _id: null,
                    totalOutstanding: {$sum: {$cond: [{$gt: ['$balance', 0]}, '$balance', 0]}},
                    totalAdvances: {$sum: {$cond: [{$lt: ['$balance', 0]}, {$multiply: ['$balance', -1]}, 0]}},
                    customersWithOutstanding: {$sum: {$cond: [{$gt: ['$balance', 0]}, 1, 0]}},
                    customersWithAdvances: {$sum: {$cond: [{$lt: ['$balance', 0]}, 1, 0]}},
                }
            },
        ]),
        Transaction.aggregate([
            {$match: {status: 'ACTIVE', createdAt: {$gte: day}}},
            {$group: {_id: '$transactionType', total: {$sum: '$amountCents'}}},
        ]),
        Transaction.aggregate([
            {$match: {status: 'ACTIVE', createdAt: {$gte: month}}},
            {$group: {_id: '$transactionType', total: {$sum: '$amountCents'}}},
        ]),
        Category.aggregate([
            {
                $lookup: {
                    from: 'transactions', let: {categoryId: '$_id'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ['$categoryId', '$$categoryId']},
                                        {$eq: ['$status', 'ACTIVE']},
                                        {$eq: ['$transactionType', 'CREDIT']},
                                    ]
                                }
                            }
                        },
                        {$group: {_id: null, total: {$sum: '$amountCents'}}},
                    ], as: 'summary',
                }
            },
            {$project: {name: 1, total: {$ifNull: [{$first: '$summary.total'}, 0]}}},
        ]),
        Transaction.aggregate([
            {$match: {status: 'ACTIVE'}},
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
            {$lookup: {from: 'customers', localField: '_id', foreignField: '_id', as: 'customer'}},
            {
                $project: {
                    name: {$ifNull: [{$first: '$customer.name'}, 'Unknown customer']},
                    customerCode: {$ifNull: [{$first: '$customer.customerCode'}, '-']},
                    balance: 1,
                }
            },
        ]),
    ]);

    const summary = balanceSummary[0] || {};
    const value = (rows: any[], type: string) =>
        (rows.find(row => row._id === type)?.total || 0) / 100;
    const highestCreditCustomers = customerBalances
        .filter(item => item.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10)
        .map(item => ({id: item._id, name: item.name, customerCode: item.customerCode, amount: item.balance / 100}));
    const highestAdvanceCustomers = customerBalances
        .filter(item => item.balance < 0)
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 5)
        .map(item => ({id: item._id, name: item.name, customerCode: item.customerCode, amount: -item.balance / 100}));

    res.json({
        totalCustomers,
        customersWithOutstanding: summary.customersWithOutstanding || 0,
        customersWithAdvances: summary.customersWithAdvances || 0,
        totalOutstanding: (summary.totalOutstanding || 0) / 100,
        totalAdvances: (summary.totalAdvances || 0) / 100,
        todayCredit: value(today, 'CREDIT'),
        todayPayments: value(today, 'PAYMENT'),
        monthCredit: value(monthly, 'CREDIT'),
        monthPayments: value(monthly, 'PAYMENT'),
        categories: categories.map(item => ({name: item.name, total: item.total / 100})),
        highestCreditCustomers,
        highestAdvanceCustomers,
    });
}));

export default router;