import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {connectDB} from './config/db.js';
import {User} from './models/User.js';
import {Category} from './models/Category.js';

function requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Missing required seed environment variable: ${name}`);
    return value;
}

const users = [
    {
        username: requiredEnvironment('SEED_ADMIN_USERNAME'),
        fullName: requiredEnvironment('SEED_ADMIN_FULL_NAME'),
        role: 'ADMIN' as const,
    },
    {
        username: requiredEnvironment('SEED_CASHIER_1_USERNAME'),
        fullName: requiredEnvironment('SEED_CASHIER_1_FULL_NAME'),
        role: 'CASHIER' as const,
    },
    {
        username: requiredEnvironment('SEED_CASHIER_2_USERNAME'),
        fullName: requiredEnvironment('SEED_CASHIER_2_FULL_NAME'),
        role: 'CASHIER' as const,
    },
];

const initialPassword = requiredEnvironment('SEED_INITIAL_PASSWORD');
if (initialPassword.length < 10) {
    throw new Error('SEED_INITIAL_PASSWORD must contain at least 10 characters.');
}

const categories = ['Goods', 'Reload', 'Photocopy', 'Printout', 'Other'];

try {
    await connectDB();
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    for (const user of users) {
        await User.updateOne(
            {username: user.username},
            {
                $setOnInsert: {
                    ...user,
                    passwordHash,
                    status: 'ACTIVE',
                },
            },
            {upsert: true},
        );
    }

    for (const name of categories) {
        await Category.updateOne(
            {name},
            {$setOnInsert: {name, status: 'ACTIVE'}},
            {upsert: true},
        );
    }

    console.log('Initialized the 3 configured users and 5 categories. No business data was created.');
} finally {
    await mongoose.disconnect();
}