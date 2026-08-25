import {Schema, model} from 'mongoose';

const schema = new Schema({
    shopName: {type: String, default: 'අපේ කඩේ ණය පොත'},
    address: {type: String, default: ''},
    phone: {type: String, default: ''},
    currency: {type: String, default: 'LKR'},
    receiptFooter: {type: String, default: 'ස්තූතියි!'}
}, {timestamps: true});
export const ShopSettings = model('ShopSettings', schema);
