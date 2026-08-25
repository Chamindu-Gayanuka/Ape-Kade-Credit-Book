import {Schema, model} from 'mongoose';

const schema = new Schema({
    transactionCode: {type: String, required: true, unique: true, index: true},
    customerId: {type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true},
    transactionType: {type: String, enum: ['CREDIT', 'PAYMENT', 'ADJUSTMENT', 'VOID'], required: true, index: true},
    categoryId: {type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true},
    amountCents: {type: Number, required: true, min: 1},
    description: {type: String, default: ''},
    paymentMethod: {type: String, enum: ['Cash', 'Bank Transfer', 'Other', null], default: null},
    referenceNumber: {type: String, default: ''},
    notes: {type: String, default: ''},
    status: {type: String, enum: ['ACTIVE', 'VOID', 'CORRECTED'], default: 'ACTIVE', index: true},
    createdBy: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    voidReason: {type: String, default: ''},
    voidedBy: {type: Schema.Types.ObjectId, ref: 'User'},
    voidedAt: Date
}, {timestamps: true});
schema.index({createdAt: -1});
schema.index({customerId: 1, createdAt: -1});
export const Transaction = model('Transaction', schema);
