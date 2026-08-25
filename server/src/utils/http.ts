import type {NextFunction, Request, Response} from 'express';

export class AppError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

export const asyncHandler = (fn: (r: Request, s: Response, n: NextFunction) => Promise<unknown>) => (r: Request, s: Response, n: NextFunction) => Promise.resolve(fn(r, s, n)).catch(n);
export const pageParams = (q: Request['query']) => ({
    page: Math.max(1, Number(q.page) || 1),
    limit: Math.min(100, Math.max(1, Number(q.limit) || 20))
});
export const cents = (value: unknown) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new AppError(400, 'Invalid amount.');
    return Math.round((n + Number.EPSILON) * 100)
};
