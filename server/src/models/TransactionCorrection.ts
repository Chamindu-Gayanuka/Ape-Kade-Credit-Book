import {Schema, model} from 'mongoose';

const schema = new Schema({
    originalTransactionId: {type: Schema.Types.ObjectId, ref: 'Transaction', required: true},
    correctingTransactionId: {type: Schema.Types.ObjectId, ref: 'Transaction', required: true},
    reason: {type: String, required: true},
    correctedBy: {type: Schema.Types.ObjectId, ref: 'User', required: true}
}, {timestamps: true});
export const TransactionCorrection = model('TransactionCorrection', schema);
