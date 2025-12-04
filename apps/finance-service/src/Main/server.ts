import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { PrismaTransactionRepository } from '../Infrastructure/Database/PrismaTransactionRepository';
import { CreateTransaction } from '../Application/UseCases/CreateTransaction';
import { GetTransactions } from '../Application/UseCases/GetTransactions';
import { UpdateTransaction } from '../Application/UseCases/UpdateTransaction';
import { DeleteTransaction } from '../Application/UseCases/DeleteTransaction';
import { TransactionController } from '../Infrastructure/Http/TransactionController';
import { authMiddleware } from '../Infrastructure/Http/Middleware/AuthMiddleware';

dotenv.config();

const app = express();
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

import { PrismaCategoryRepository } from '../Infrastructure/Database/PrismaCategoryRepository';
import { GetCategories } from '../Application/UseCases/GetCategories';
import { CreateCategory } from '../Application/UseCases/CreateCategory';
import { CategoryController } from '../Infrastructure/Http/CategoryController';

const prisma = new PrismaClient();

// Transaction Dependencies
const transactionRepository = new PrismaTransactionRepository(prisma);
const createTransaction = new CreateTransaction(transactionRepository);
const getTransactions = new GetTransactions(transactionRepository);
const updateTransaction = new UpdateTransaction(transactionRepository);
const deleteTransaction = new DeleteTransaction(transactionRepository);
const transactionController = new TransactionController(
    createTransaction,
    getTransactions,
    updateTransaction,
    deleteTransaction
);

// Category Dependencies
const categoryRepository = new PrismaCategoryRepository(prisma);
const getCategories = new GetCategories(categoryRepository);
const createCategory = new CreateCategory(categoryRepository);
const categoryController = new CategoryController(getCategories, createCategory);

app.post('/transactions', authMiddleware, (req, res) => transactionController.handleCreate(req, res));
app.get('/transactions', authMiddleware, (req, res) => transactionController.handleGet(req, res));
app.put('/transactions/:id', authMiddleware, (req, res) => transactionController.handleUpdate(req, res));
app.delete('/transactions/:id', authMiddleware, (req, res) => transactionController.handleDelete(req, res));

app.post('/categories', authMiddleware, (req, res) => categoryController.handleCreate(req, res));
app.get('/categories', authMiddleware, (req, res) => categoryController.handleGet(req, res));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'finance-service' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Finance Service running on port ${PORT}`);
});
