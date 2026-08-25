import {Schema, model} from 'mongoose';

const schema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
    action: {type: String, required: true, index: true},
    entityType: String,
    entityId: {type: Schema.Types.ObjectId},
    description: {type: String, required: true},
    metadata: {type: Schema.Types.Mixed, default: {}},
    ipAddress: String
}, {timestamps: {createdAt: true, updatedAt: false}});
schema.index({createdAt: -1});
export const AuditLog = model('AuditLog', schema);
