import {Schema, model} from 'mongoose';

const schema = new Schema({
    name: {type: String, required: true, unique: true, trim: true},
    description: {type: String, default: ''},
    status: {type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE'}
}, {timestamps: true});
export const Category = model('Category', schema);
