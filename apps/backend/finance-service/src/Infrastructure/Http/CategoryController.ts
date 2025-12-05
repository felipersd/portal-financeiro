import { Request, Response } from 'express';
import { GetCategories } from '../../Application/UseCases/GetCategories';
import { CreateCategory } from '../../Application/UseCases/CreateCategory';

export class CategoryController {
    constructor(
        private getCategories: GetCategories,
        private createCategory: CreateCategory
    ) { }

    async handleGet(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub;
            const categories = await this.getCategories.execute(userId);
            res.json(categories);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }

    async handleCreate(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub;
            const { name, type } = req.body;

            if (!name || !type) {
                return res.status(400).json({ error: 'Name and type are required' });
            }

            const category = await this.createCategory.execute(name, type, userId);
            res.status(201).json(category);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create category' });
        }
    }
}
