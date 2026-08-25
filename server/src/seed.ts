import bcrypt from 'bcryptjs';
import {connectDB} from './config/db.js';
import {User} from './models/User.js';
import {Category} from './models/Category.js';
import mongoose from 'mongoose';

const users = [{username: 'Gayanuka', fullName: 'Chamindu Gayanuka', role: 'ADMIN'}, {
    username: 'Priyantha',
    fullName: 'Priyantha Dharmasiri',
    role: 'CASHIER'
}, {username: 'Thamara', fullName: 'Thamara Dharmaseeli', role: 'CASHIER'}] as const;
const categories = ['Goods', 'Reload', 'Photocopy', 'Printout', 'Other'];
await connectDB();
const passwordHash = await bcrypt.hash('Apekade@2025', 12);
for (const u of users) await User.updateOne({username: u.username}, {
    $setOnInsert: {
        ...u,
        passwordHash,
        status: 'ACTIVE'
    }
}, {upsert: true});
for (const name of categories) await Category.updateOne({name}, {
    $setOnInsert: {
        name,
        status: 'ACTIVE'
    }
}, {upsert: true});
console.log('Initialized exactly 3 required users and 5 categories. No business data was created.');
await mongoose.disconnect();
