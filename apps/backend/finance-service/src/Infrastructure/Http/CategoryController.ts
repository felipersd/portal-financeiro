import { Request, Response } from 'express';
import { GetCategories } from '../../Application/UseCases/GetCategories';
import { CreateCategory } from '../../Application/UseCases/CreateCategory';
import { DeleteCategory } from '../../Application/UseCases/DeleteCategory';
import { UpdateCategory } from '../../Application/UseCases/UpdateCategory';

export class CategoryController {
    constructor(
        private getCategories: GetCategories,
        private createCategory: CreateCategory,
        private deleteCategory: DeleteCategory,
        private updateCategory: UpdateCategory
    ) { }

    async handleGet(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const categories = await this.getCategories.execute(userId);
            res.json(categories);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }

    async handleCreate(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
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

    async handleDelete(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const { id } = req.params;

            await this.deleteCategory.execute(id, userId);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'Category not found') {
                return res.status(404).json({ error: error.message });
            } else if (error.message === 'Unauthorized') {
                return res.status(403).json({ error: error.message });
            } else {
                return res.status(500).json({ error: 'Failed to delete category' });
            }
        }
    }

    async handleUpdate(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const { id } = req.params;
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }

            const category = await this.updateCategory.execute(id, name, userId);
            res.json(category);
        } catch (error: any) {
            if (error.message === 'Category not found') {
                return res.status(404).json({ error: error.message });
            } else if (error.message === 'Unauthorized') {
                return res.status(403).json({ error: error.message });
            } else {
                return res.status(500).json({ error: 'Failed to update category' });
            }
        }
    }
}
