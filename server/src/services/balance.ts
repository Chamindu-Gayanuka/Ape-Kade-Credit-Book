import { Types, type ClientSession } from 'mongoose';
import { Transaction } from '../models/Transaction.js';

export async function balanceCents(
  customerId: string | Types.ObjectId,
  session?: ClientSession,
) {
  const aggregate = Transaction.aggregate([
    { $match: { customerId: new Types.ObjectId(String(customerId)), status: 'ACTIVE' } },
    { $group: { _id: null, total: { $sum: { $switch: {
      branches: [
        { case: { $eq: ['$transactionType', 'CREDIT'] }, then: '$amountCents' },
        { case: { $eq: ['$transactionType', 'ADJUSTMENT'] }, then: '$amountCents' },
        { case: { $eq: ['$transactionType', 'PAYMENT'] }, then: { $multiply: ['$amountCents', -1] } },
      ],
      default: 0,
    } } } } },
  ]);
  if (session) aggregate.session(session);
  const [result] = await aggregate;
  return result?.total || 0;
}

export const amountView = (doc: any) => ({
  ...doc,
  amount: (doc.amountCents || 0) / 100,
  amountCents: undefined,
});
