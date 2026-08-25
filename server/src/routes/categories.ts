import {Router} from 'express';
import {Category} from '../models/Category.js';
import {authenticateUser, requireAdmin} from '../middleware/auth.js';
import {audit} from '../services/audit.js';
import {AppError, asyncHandler} from '../utils/http.js';

const router = Router();
router.use(authenticateUser);

router.get('/', asyncHandler(async (_req, res) => {
    res.json(await Category.find().sort({name: 1}));
}));

// Category creation is operationally available while recording credit. Editing,
// activating, or deactivating existing categories remains Admin-only.
router.post('/', asyncHandler(async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (!name) throw new AppError(400, 'Category name is required.');
    if (name.length > 60) throw new AppError(400, 'Category name must not exceed 60 characters.');

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Category.findOne({name: {$regex: `^${escaped}$`, $options: 'i'}});
    if (existing) {
        if (existing.status !== 'ACTIVE') {
            throw new AppError(400, 'This category exists but is inactive. Ask an administrator to activate it.');
        }
        return res.json(existing);
    }

    const category = await Category.create({name, description, status: 'ACTIVE'});
    await audit(
        req.user!.id, 'CATEGORY_CREATED', 'Category', category._id,
        `Category ${category.name} created during credit entry`, {}, req.ip,
    );
    res.status(201).json(category);
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(
        req.params.id, req.body, {new: true, runValidators: true},
    );
    if (!category) throw new AppError(404, 'Category not found.');
    res.json(category);
}));

export default router;
