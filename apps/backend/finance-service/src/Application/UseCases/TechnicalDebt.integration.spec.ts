import { randomUUID } from 'crypto';
import { createDatabaseClient } from '../../Infrastructure/Database/createDatabaseClient';
import { PrismaTransactionRepository } from '../../Infrastructure/Database/PrismaTransactionRepository';
import { PrismaCategoryRepository } from '../../Infrastructure/Database/PrismaCategoryRepository';
import { PrismaBudgetRuleRepository } from '../../Infrastructure/Database/PrismaBudgetRuleRepository';
import { Transaction } from '../../Domain/Entities/Transaction';
import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { UpdateBudgetRule } from './UpdateBudgetRule';
const suite = process.env.INTEGRATION_TESTS === '1' ? describe : describe.skip;
suite('Financial integrity and monthly versions', () => {
 let db: ReturnType<typeof createDatabaseClient>;
 let repository: PrismaTransactionRepository;
 let userId: string;
 beforeAll(() => { db = createDatabaseClient(); repository = new PrismaTransactionRepository(db); });
 beforeEach(() => { userId = randomUUID(); });
 afterEach(async () => {
  await db.budgetRule.deleteMany({ where: { userId } });
  await db.transaction.deleteMany({ where: { userId } });
  await db.category.deleteMany({ where: { userId } });
  await db.groupMember.deleteMany({ where: { userId } });
 });
 afterAll(async () => { await db.$disconnect(); });
 it('stores decimal money and relational parts; rename preserves category references', async () => {
  const member = await db.groupMember.create({ data: { userId, name: 'Test', category: 'Amigo' } });
  const id = randomUUID();
  await repository.create(new Transaction(id, 'Shared', 0.3, 'expense', 'Casa', new Date(), true, 'me', userId, new Date(), null,
   { splits: [{ memberId: 'me', amount: 0.1 }, { memberId: member.id, amount: 0.2 }] }));
  const stored = await db.transaction.findUniqueOrThrow({ where: { id }, include: { splits: true } });
  expect(stored.amount.toFixed(2)).toBe('0.30');
  expect(stored.splits.reduce((sum,s) => sum+s.amountCents,0)).toBe(30);
  const categories = new PrismaCategoryRepository(db);
  await categories.update(stored.categoryId!, 'Lar', 'expense');
  expect(await repository.findById(id)).toMatchObject({ category: 'Lar', categoryId: stored.categoryId, amount: 0.3 });
  await expect(categories.delete(stored.categoryId!)).rejects.toMatchObject({ status: 409 });
  await expect(categories.update(stored.categoryId!, 'Lar', 'income')).rejects.toMatchObject({ status: 409 });
 });
 it('preserves other months and rejects edits from stale sessions', async () => {
  const budgets = new PrismaBudgetRuleRepository(db);
  const divisions = [{ id:'needs', name:'Essenciais', percentage:100, color:'#ffffff' }];
  const current = await budgets.create(new BudgetRule(randomUUID(), userId, '2026-09', divisions, {}));
  const future = await budgets.create(new BudgetRule(randomUUID(), userId, '2026-10', divisions, {}));
  const update = new UpdateBudgetRule(budgets);
  const changed = await update.execute(userId, '2026-09', { revision: 0, divisions:[{...divisions[0],name:'Casa'}] });
  expect(changed.revision).toBe(1);
  expect((await budgets.findByMonth(userId,'2026-10'))?.divisions).toEqual(future.divisions);
  await expect(update.execute(userId, '2026-09', { revision: 0, divisions })).rejects.toMatchObject({ status: 409 });
  expect(await db.budgetRuleVersion.count({ where:{ruleId:current.id} })).toBe(2);
 });
 it('serializes two simultaneous creations of the same month', async () => {
  const budgets = new PrismaBudgetRuleRepository(db);
  const make = () => new BudgetRule(randomUUID(), userId, '2026-09', [{id:'one',name:'Total',percentage:100,color:'#ffffff'}], {});
  const [a,b] = await Promise.all([budgets.create(make()),budgets.create(make())]);
  expect(a.id).toBe(b.id);
 });
});
