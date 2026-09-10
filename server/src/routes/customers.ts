import { Router } from "express";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { Transaction } from "../models/Transaction.js";
import { TransactionCorrection } from "../models/TransactionCorrection.js";
import { AuditLog } from "../models/AuditLog.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import { audit } from "../services/audit.js";
import { balanceCents, amountView } from "../services/balance.js";
import { AppError, asyncHandler, pageParams } from "../utils/http.js";

const router = Router();
router.use(authenticateUser);

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const { page, limit } = pageParams(req.query);
        const search = String(req.query.search || "").trim();
        const status = String(req.query.status || "");
        const query: any = {};
        if (status) query.status = status;
        if (search) {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.$or = ["name", "phone", "nic", "customerCode"].map((key) => ({
                [key]: { $regex: safe, $options: "i" },
            }));
        }

        const [items, total] = await Promise.all([
            Customer.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Customer.countDocuments(query),
        ]);
        const ids = items.map((item) => item._id);
        const sums = await Transaction.aggregate([
            { $match: { customerId: { $in: ids }, status: "ACTIVE" } },
            {
                $group: {
                    _id: "$customerId",
                    balance: {
                        $sum: {
                            $cond: [
                                { $eq: ["$transactionType", "PAYMENT"] },
                                { $multiply: ["$amountCents", -1] },
                                "$amountCents",
                            ],
                        },
                    },
                },
            },
        ]);
        const balanceMap = new Map(
            sums.map((item) => [String(item._id), item.balance]),
        );

        res.json({
            items: items.map((item) => {
                const ledgerCents = balanceMap.get(String(item._id)) || 0;
                return {
                    ...item,
                    outstandingBalance: Math.max(0, ledgerCents) / 100,
                    advanceBalance: Math.max(0, -ledgerCents) / 100,
                    ledgerBalance: ledgerCents / 100,
                };
            }),
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        });
    }),
);

router.post(
    "/",
    asyncHandler(async (req, res) => {
        const { name, phone = "", nic = "", address = "", notes = "" } = req.body;
        if (!name?.trim()) throw new AppError(400, "Customer name is required.");
        const last = await Customer.findOne().sort({ createdAt: -1 }).lean();
        const nextNumber = last
            ? Number(last.customerCode.replace(/\D/g, "")) + 1
            : 1;
        const customer = await Customer.create({
            customerCode: `CUS-${String(nextNumber).padStart(5, "0")}`,
            name: name.trim(),
            phone,
            nic,
            address,
            notes,
        });
        await audit(
            req.user!.id,
            "CUSTOMER_CREATED",
            "Customer",
            customer._id,
            `Customer ${customer.customerCode} created`,
            {},
            req.ip,
        );
        res.status(201).json({
            ...customer.toObject(),
            outstandingBalance: 0,
            advanceBalance: 0,
            ledgerBalance: 0,
        });
    }),
);

router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const customer = await Customer.findById(req.params.id).lean();
        if (!customer) throw new AppError(404, "Customer not found.");
        const ledgerCents = await balanceCents(customer._id);
        res.json({
            ...customer,
            outstandingBalance: Math.max(0, ledgerCents) / 100,
            advanceBalance: Math.max(0, -ledgerCents) / 100,
            ledgerBalance: ledgerCents / 100,
        });
    }),
);

router.put(
    "/:id",
    asyncHandler(async (req, res) => {
        const allowed = ["name", "phone", "nic", "address", "notes", "status"];
        const update: any = {};
        for (const key of allowed)
            if (req.body[key] !== undefined) update[key] = req.body[key];
        const customer = await Customer.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        });
        if (!customer) throw new AppError(404, "Customer not found.");
        await audit(
            req.user!.id,
            "CUSTOMER_UPDATED",
            "Customer",
            customer._id,
            `Customer ${customer.customerCode} updated`,
            {},
            req.ip,
        );
        res.json(customer);
    }),
);

router.get(
    "/:id/transactions",
    asyncHandler(async (req, res) => {
        const { page, limit } = pageParams(req.query);
        const query = { customerId: req.params.id };
        const [items, total] = await Promise.all([
            Transaction.find(query)
                .populate("categoryId", "name")
                .populate("createdBy", "fullName username")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Transaction.countDocuments(query),
        ]);
        res.json({
            items: items.map(amountView),
            page,
            total,
            pages: Math.ceil(total / limit),
        });
    }),
);

router.get(
    "/:id/balance",
    asyncHandler(async (req, res) => {
        if (!(await Customer.exists({ _id: req.params.id })))
            throw new AppError(404, "Customer not found.");
        const ledgerCents = await balanceCents(String(req.params.id));
        res.json({
            outstandingBalance: Math.max(0, ledgerCents) / 100,
            advanceBalance: Math.max(0, -ledgerCents) / 100,
            ledgerBalance: ledgerCents / 100,
        });
    }),
);

router.get(
    "/:id/deletion-impact",
    requireAdmin,
    asyncHandler(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id))
            throw new AppError(400, "Invalid customer ID.");
        const customer = await Customer.findById(req.params.id).lean();
        if (!customer) throw new AppError(404, "Customer not found.");

        const transactionSummary = await Transaction.aggregate([
            { $match: { customerId: customer._id } },
            {
                $group: {
                    _id: "$transactionType",
                    count: { $sum: 1 },
                    amountCents: { $sum: "$amountCents" },
                },
            },
        ]);
        const transactionIds = await Transaction.find({
            customerId: customer._id,
        }).distinct("_id");
        const [corrections, auditReferences] = await Promise.all([
            TransactionCorrection.countDocuments({
                $or: [
                    { originalTransactionId: { $in: transactionIds } },
                    { correctingTransactionId: { $in: transactionIds } },
                ],
            }),
            AuditLog.countDocuments({
                $or: [
                    { entityId: customer._id },
                    { entityId: { $in: transactionIds } },
                    { "metadata.customerId": String(customer._id) },
                ],
            }),
        ]);
        const byType = Object.fromEntries(
            transactionSummary.map((item) => [
                item._id,
                {
                    count: item.count,
                    amount: item.amountCents / 100,
                },
            ]),
        );

        res.json({
            customer: {
                id: customer._id,
                customerCode: customer.customerCode,
                name: customer.name,
            },
            connectedData: {
                credits: byType.CREDIT || { count: 0, amount: 0 },
                payments: byType.PAYMENT || { count: 0, amount: 0 },
                adjustments: byType.ADJUSTMENT || { count: 0, amount: 0 },
                voidEntries: byType.VOID || { count: 0, amount: 0 },
                totalTransactions: transactionIds.length,
                corrections,
                auditReferences,
            },
            deletionPolicy: {
                deleted: [
                    "Customer profile",
                    "Credit transactions",
                    "Payment transactions",
                    "Adjustments",
                    "Transaction corrections",
                ],
                retained: ["Audit logs, including a permanent CUSTOMER_DELETED record"],
            },
        });
    }),
);

router.delete(
    "/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id))
            throw new AppError(400, "Invalid customer ID.");
        const confirmation =
            typeof req.body.confirmation === "string"
                ? req.body.confirmation.trim()
                : "";
        const reason =
            typeof req.body.reason === "string" ? req.body.reason.trim() : "";
        if (reason.length < 5)
            throw new AppError(
                400,
                "A deletion reason of at least 5 characters is required.",
            );

        const deleteInTransaction = async () => {
            const session = await mongoose.startSession();
            let result: any;
            try {
                await session.withTransaction(async () => {
                    const customer = await Customer.findById(req.params.id).session(
                        session,
                    );
                    if (!customer) throw new AppError(404, "Customer not found.");
                    if (confirmation !== customer.customerCode) {
                        throw new AppError(
                            400,
                            `Type ${customer.customerCode} to confirm permanent deletion.`,
                        );
                    }

                    const transactions = await Transaction.find({
                        customerId: customer._id,
                    })
                        .select("_id transactionType amountCents")
                        .session(session)
                        .lean();
                    const transactionIds = transactions.map((item) => item._id);
                    const correctionFilter = {
                        $or: [
                            { originalTransactionId: { $in: transactionIds } },
                            { correctingTransactionId: { $in: transactionIds } },
                        ],
                    };
                    const corrections =
                        await TransactionCorrection.countDocuments(
                            correctionFilter,
                        ).session(session);
                    const counts = transactions.reduce(
                        (summary: Record<string, number>, item: any) => {
                            summary[item.transactionType] =
                                (summary[item.transactionType] || 0) + 1;
                            return summary;
                        },
                        {},
                    );

                    await TransactionCorrection.deleteMany(correctionFilter, { session });
                    await Transaction.deleteMany(
                        { customerId: customer._id },
                        { session },
                    );
                    await Customer.deleteOne({ _id: customer._id }, { session });
                    await audit(
                        req.user!.id,
                        "CUSTOMER_DELETED",
                        "Customer",
                        customer._id,
                        `Customer ${customer.customerCode} and connected financial data permanently deleted`,
                        {
                            customerCode: customer.customerCode,
                            customerName: customer.name,
                            reason,
                            deletionMode: "MONGODB_TRANSACTION",
                            deletedTransactions: transactions.length,
                            deletedCorrections: corrections,
                            transactionCounts: counts,
                        },
                        req.ip,
                        session,
                    );
                    result = {
                        message: "Customer and connected data were permanently deleted.",
                        deleted: {
                            customer: 1,
                            transactions: transactions.length,
                            corrections,
                        },
                        mode: "MONGODB_TRANSACTION",
                    };
                });
                return result;
            } finally {
                await session.endSession();
            }
        };

        const deleteWithCompensation = async () => {
            const customer = await Customer.findById(req.params.id).lean();
            if (!customer) throw new AppError(404, "Customer not found.");
            if (confirmation !== customer.customerCode) {
                throw new AppError(
                    400,
                    `Type ${customer.customerCode} to confirm permanent deletion.`,
                );
            }

            // Preserve complete BSON snapshots before any standalone deletion. If any step
            // fails, every deleted document is restored with its original _id and timestamps.
            const transactions = await Transaction.find({
                customerId: customer._id,
            }).lean();
            const transactionIds = transactions.map((item) => item._id);
            const correctionFilter = {
                $or: [
                    { originalTransactionId: { $in: transactionIds } },
                    { correctingTransactionId: { $in: transactionIds } },
                ],
            };
            const corrections =
                await TransactionCorrection.find(correctionFilter).lean();
            const counts = transactions.reduce(
                (summary: Record<string, number>, item: any) => {
                    summary[item.transactionType] =
                        (summary[item.transactionType] || 0) + 1;
                    return summary;
                },
                {},
            );

            try {
                // In standalone mode, make the customer inactive first to block ordinary new
                // entries during the short cascade operation.
                await Customer.updateOne(
                    { _id: customer._id },
                    { $set: { status: "INACTIVE" } },
                );
                await TransactionCorrection.deleteMany(correctionFilter);
                await Transaction.deleteMany({ customerId: customer._id });
                await Customer.deleteOne({ _id: customer._id });
                await audit(
                    req.user!.id,
                    "CUSTOMER_DELETED",
                    "Customer",
                    customer._id,
                    `Customer ${customer.customerCode} and connected financial data permanently deleted`,
                    {
                        customerCode: customer.customerCode,
                        customerName: customer.name,
                        reason,
                        deletionMode: "STANDALONE_COMPENSATION",
                        deletedTransactions: transactions.length,
                        deletedCorrections: corrections.length,
                        transactionCounts: counts,
                    },
                    req.ip,
                );
                return {
                    message: "Customer and connected data were permanently deleted.",
                    deleted: {
                        customer: 1,
                        transactions: transactions.length,
                        corrections: corrections.length,
                    },
                    mode: "STANDALONE_COMPENSATION",
                };
            } catch (error) {
                try {
                    await Customer.collection.replaceOne(
                        { _id: customer._id },
                        customer as any,
                        { upsert: true },
                    );
                    if (transactions.length) {
                        await Transaction.collection.bulkWrite(
                            transactions.map((document) => ({
                                replaceOne: {
                                    filter: { _id: document._id },
                                    replacement: document as any,
                                    upsert: true,
                                },
                            })),
                        );
                    }
                    if (corrections.length) {
                        await TransactionCorrection.collection.bulkWrite(
                            corrections.map((document) => ({
                                replaceOne: {
                                    filter: { _id: document._id },
                                    replacement: document as any,
                                    upsert: true,
                                },
                            })),
                        );
                    }
                } catch (restoreError) {
                    console.error(
                        "CRITICAL: Customer deletion compensation failed:",
                        restoreError,
                    );
                    throw new AppError(
                        500,
                        "Deletion failed and automatic restoration was incomplete. Stop financial entry and contact the administrator.",
                    );
                }
                throw error;
            }
        };

        try {
            res.json(await deleteInTransaction());
        } catch (error: any) {
            const unsupported =
                error?.code === 20 ||
                error?.codeName === "IllegalOperation" ||
                /Transaction numbers are only allowed|replica set member or mongos|transactions are not supported/i.test(
                    String(error?.message || ""),
                );
            if (!unsupported) throw error;
            console.warn(
                "MongoDB transactions unavailable; customer deletion is using standalone compensation mode.",
            );
            res.json(await deleteWithCompensation());
        }
    }),
);
export default router;