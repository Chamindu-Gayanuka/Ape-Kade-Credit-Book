import mongoose, {type ClientSession} from 'mongoose';

let warnedStandalone = false;

function transactionsUnavailable(error: any) {
    const text = String(error?.message || '');
    return error?.code === 20 || error?.codeName === 'IllegalOperation' ||
        /Transaction numbers are only allowed|replica set member or mongos|transactions are not supported/i.test(text);
}

/**
 * Runs the operation in a MongoDB transaction when the deployment supports it.
 * Local standalone MongoDB installations do not support multi-document sessions,
 * so they use the operation's explicit compensating-write path instead.
 */
export async function runAtomic<T>(
    operation: (session?: ClientSession) => Promise<T>,
): Promise<T> {
    const session = await mongoose.startSession();
    try {
        let result!: T;
        await session.withTransaction(async () => {
            result = await operation(session);
        });
        return result;
    } catch (error) {
        if (!transactionsUnavailable(error)) throw error;
        if (!warnedStandalone) {
            warnedStandalone = true;
            console.warn('MongoDB transactions unavailable; using safe standalone compensation mode. Use a replica set in production.');
        }
        return operation(undefined);
    } finally {
        await session.endSession();
    }
}
