import {Router} from 'express';
import mongoose from 'mongoose';
import {authenticateUser} from '../middleware/auth.js';
import {Transaction} from '../models/Transaction.js';
import {Customer} from '../models/Customer.js';
import {Category} from '../models/Category.js';
import {asyncHandler} from '../utils/http.js';

const router = Router();
router.use(authenticateUser);
const period = async (start: Date, end: Date) => {
    const rows = await Transaction.aggregate([
        {$match: {status: 'ACTIVE', createdAt: {$gte: start, $lte: end}}},
        {$group: {_id: '$transactionType', total: {$sum: '$amountCents'}, count: {$sum: 1}}},
    ]);
    const get = (type: string) => rows.find(row => row._id === type) || {total: 0, count: 0};
    return {
        totalCredit: get('CREDIT').total / 100, totalPayments: get('PAYMENT').total / 100,
        netCredit: (get('CREDIT').total - get('PAYMENT').total) / 100,
        creditCount: get('CREDIT').count, paymentCount: get('PAYMENT').count
    };
};

router.get('/overview', asyncHandler(async (req, res) => {
    const end = req.query.to ? new Date(String(req.query.to)) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = req.query.from ? new Date(String(req.query.from)) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const match: any = {status: 'ACTIVE', createdAt: start ? {$gte: start, $lte: end} : {$lte: end}};
    if (req.query.customerId && mongoose.isValidObjectId(req.query.customerId)) match.customerId = new mongoose.Types.ObjectId(String(req.query.customerId));
    const [summary, trend, categories, users, monthlyRows, topCustomers] = await Promise.all([
        Transaction.aggregate([{$match: match}, {
            $group: {
                _id: '$transactionType',
                total: {$sum: '$amountCents'},
                count: {$sum: 1},
                average: {$avg: '$amountCents'}
            }
        }]),
        Transaction.aggregate([{$match: match}, {
            $group: {
                _id: {
                    day: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    }, type: '$transactionType'
                }, total: {$sum: '$amountCents'}, count: {$sum: 1}
            }
        }, {$sort: {'_id.day': 1}}]),
        Transaction.aggregate([{$match: {...match, transactionType: 'CREDIT'}}, {
            $group: {
                _id: '$categoryId',
                total: {$sum: '$amountCents'},
                count: {$sum: 1}
            }
        }, {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        }, {
            $project: {
                name: {$ifNull: [{$first: '$category.name'}, 'Uncategorized']},
                total: {$divide: ['$total', 100]},
                count: 1
            }
        }, {$sort: {total: -1}}]),
        Transaction.aggregate([{$match: match}, {
            $group: {
                _id: '$createdBy',
                total: {$sum: '$amountCents'},
                count: {$sum: 1}
            }
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        }, {
            $project: {
                name: {$ifNull: [{$first: '$user.fullName'}, 'Unknown']},
                total: {$divide: ['$total', 100]},
                count: 1
            }
        }, {$sort: {count: -1}}]),
        Transaction.aggregate([{$match: match}, {
            $group: {
                _id: {
                    month: {
                        $dateToString: {
                            format: '%Y-%m',
                            date: '$createdAt'
                        }
                    }, type: '$transactionType'
                }, total: {$sum: '$amountCents'}, count: {$sum: 1}
            }
        }, {$sort: {'_id.month': 1}}]),
        Transaction.aggregate([{$match: match}, {
            $group: {
                _id: '$customerId',
                credit: {$sum: {$cond: [{$eq: ['$transactionType', 'CREDIT']}, '$amountCents', 0]}},
                payments: {$sum: {$cond: [{$eq: ['$transactionType', 'PAYMENT']}, '$amountCents', 0]}},
                count: {$sum: 1}
            }
        }, {
            $lookup: {
                from: 'customers',
                localField: '_id',
                foreignField: '_id',
                as: 'customer'
            }
        }, {
            $project: {
                name: {$first: '$customer.name'},
                customerCode: {$first: '$customer.customerCode'},
                credit: {$divide: ['$credit', 100]},
                payments: {$divide: ['$payments', 100]},
                net: {$divide: [{$subtract: ['$credit', '$payments']}, 100]},
                count: 1
            }
        }, {$sort: {credit: -1}}]),
    ]);
    const get = (type: string) => summary.find(item => item._id === type) || {total: 0, count: 0, average: 0};
    const trendMap = new Map<string, any>();
    for (const item of trend) {
        const row = trendMap.get(item._id.day) || {date: item._id.day, credit: 0, payments: 0};
        row[item._id.type === 'PAYMENT' ? 'payments' : 'credit'] += item.total / 100;
        trendMap.set(item._id.day, row);
    }
    const monthlyMap = new Map<string, any>();
    for (const item of monthlyRows) {
        const row = monthlyMap.get(item._id.month) || {
            month: item._id.month,
            credit: 0,
            payments: 0,
            creditCount: 0,
            paymentCount: 0
        };
        if (item._id.type === 'PAYMENT') {
            row.payments += item.total / 100;
            row.paymentCount += item.count;
        } else if (item._id.type === 'CREDIT') {
            row.credit += item.total / 100;
            row.creditCount += item.count;
        }
        monthlyMap.set(item._id.month, row);
    }
    res.json({
        range: {from: start, to: end},
        summary: {
            totalCredit: get('CREDIT').total / 100,
            totalPayments: get('PAYMENT').total / 100,
            creditCount: get('CREDIT').count,
            paymentCount: get('PAYMENT').count,
            averageCredit: get('CREDIT').average / 100,
            averagePayment: get('PAYMENT').average / 100,
            net: (get('CREDIT').total - get('PAYMENT').total) / 100
        },
        trend: [...trendMap.values()],
        monthlyTrend: [...monthlyMap.values()],
        categories,
        users,
        topCustomers
    });
}));

router.get('/daily', asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    res.json(await period(start, end));
}));
router.get('/monthly', asyncHandler(async (req, res) => {
    const date = req.query.month ? new Date(`${req.query.month}-01`) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    const base = await period(start, end);
    const balances = await Transaction.aggregate([{$match: {status: 'ACTIVE'}}, {
        $group: {
            _id: '$customerId',
            balance: {$sum: {$cond: [{$eq: ['$transactionType', 'PAYMENT']}, {$multiply: ['$amountCents', -1]}, '$amountCents']}}
        }
    }, {
        $group: {
            _id: null,
            outstanding: {$sum: {$cond: [{$gt: ['$balance', 0]}, '$balance', 0]}},
            advances: {$sum: {$cond: [{$lt: ['$balance', 0]}, {$multiply: ['$balance', -1]}, 0]}},
            debtors: {$sum: {$cond: [{$gt: ['$balance', 0]}, 1, 0]}}
        }
    }]);
    res.json({
        ...base,
        outstanding: (balances[0]?.outstanding || 0) / 100,
        advances: (balances[0]?.advances || 0) / 100,
        activeDebtors: balances[0]?.debtors || 0
    });
}));
router.get('/category', asyncHandler(async (_req, res) => {
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
            as: 'result'
        }
    }, {
        $project: {
            name: 1,
            count: {$ifNull: [{$first: '$result.count'}, 0]},
            total: {$divide: [{$ifNull: [{$first: '$result.total'}, 0]}, 100]}
        }
    }]);
    res.json(rows);
}));
router.get('/customers', asyncHandler(async (req, res) => {
    const sort = String(req.query.sort || 'highest');
    const rows = await Customer.aggregate([{
        $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'customerId',
            as: 'transactions'
        }
    }, {
        $addFields: {
            ledgerBalance: {
                $divide: [{
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$transactions',
                                    as: 'transaction',
                                    cond: {$eq: ['$$transaction.status', 'ACTIVE']}
                                }
                            },
                            as: 'transaction',
                            in: {$cond: [{$eq: ['$$transaction.transactionType', 'PAYMENT']}, {$multiply: ['$$transaction.amountCents', -1]}, '$$transaction.amountCents']}
                        }
                    }
                }, 100]
            }, recentActivity: {$max: '$transactions.createdAt'}, transactionCount: {$size: '$transactions'}
        }
    }, {
        $addFields: {
            outstandingBalance: {$cond: [{$gt: ['$ledgerBalance', 0]}, '$ledgerBalance', 0]},
            advanceBalance: {$cond: [{$lt: ['$ledgerBalance', 0]}, {$multiply: ['$ledgerBalance', -1]}, 0]}
        }
    }, {$project: {transactions: 0}}, {$sort: sort === 'lowest' ? {outstandingBalance: 1} : sort === 'recent' ? {recentActivity: -1} : {outstandingBalance: -1}}, {$limit: 500}]);
    res.json(rows);
}));

export default router;