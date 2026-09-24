import { randomUUID } from 'crypto';
import { createDatabaseClient } from '../../Infrastructure/Database/createDatabaseClient';
import { PrismaTransactionRepository } from '../../Infrastructure/Database/PrismaTransactionRepository';
import { PrismaCategoryRepository } from '../../Infrastructure/Database/PrismaCategoryRepository';
import { PrismaBudgetRuleRepository } from '../../Infrastructure/Database/PrismaBudgetRuleRepository';
import { Transaction } from '../../Domain/Entities/Transaction';
import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { UpdateBudgetRule } from './UpdateBudgetRule';
import { TransactionQueries } from '../../Infrastructure/Database/TransactionQueries';
import { accountRateLimit } from '../../Infrastructure/Http/Middleware/AccountRateLimit';
import express from 'express';
import request from 'supertest';
import { createHash } from 'crypto';
import { FixedRecurrences } from '../../Infrastructure/Database/FixedRecurrences';
import { CreateTransaction } from './CreateTransaction';
import { UpdateTransaction } from './UpdateTransaction';
import { Category } from '../../Domain/Entities/Category';
import { DeleteUserFinancialData } from './DeleteUserFinancialData';
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
  await db.fixedRule.deleteMany({where:{userId}});
  await db.category.deleteMany({ where: { userId } });
  await db.groupMember.deleteMany({ where: { userId } });
  await db.requestBudget.deleteMany({where:{key:{in:['sharing','read','write'].map(scope=>createHash('sha256').update(`${scope}:${userId}`).digest('hex'))}}});
 });
 afterAll(async () => { await db.$disconnect(); });
 it('makes simultaneous category creation idempotent and enforces the account limit', async () => {
  const categories = new PrismaCategoryRepository(db);
  const make = () => new Category(randomUUID(), 'Casa', 'expense', userId);
  const [first, second] = await Promise.all([categories.create(make()), categories.create(make())]);
  expect(first.id).toBe(second.id);
  expect(await db.category.count({where:{userId}})).toBe(1);
  await db.category.createMany({data:Array.from({length:199},(_,index)=>({userId,name:`Category ${index}`,type:'expense'}))});
  expect((await categories.create(make())).id).toBe(first.id);
  await expect(categories.create(new Category(randomUUID(),'Overflow','expense',userId))).rejects.toMatchObject({status:400});
  expect(await db.category.count({where:{userId}})).toBe(200);
 });
 it('deletes the full account graph idempotently while preserving another account', async () => {
  const otherUser = randomUUID();
  const untouched = await db.category.create({data:{userId:otherUser,name:'Private',type:'expense'}});
  try {
   const member = await db.groupMember.create({data:{userId,name:'Friend',category:'Amigo'}});
   const transaction = await new CreateTransaction(repository).execute({userId,description:'Fixed shared',amount:10,type:'expense',category:'Casa',
    date:new Date('2026-01-01T00:00:00Z'),isShared:true,payer:'me',frequency:'fixed',
    splitDetails:{splits:[{memberId:'me',amount:5},{memberId:member.id,amount:5}]}});
   const connection = await db.memberConnection.create({data:{memberId:member.id,ownerId:userId,ownerName:'Owner',email:'fixture@example.invalid',recipientId:otherUser,status:'accepted',expiresAt:new Date('2027-01-01')}});
   const share = await db.expenseShare.create({data:{transactionId:transaction.id,ownerId:userId,recipientId:otherUser,memberId:member.id,ownerName:'Owner',description:'Shared',amountCents:500,totalCents:1000,date:new Date(),status:'accepted'}});
   const proposal = await db.shareProposal.create({data:{shareId:share.id,proposerId:userId,kind:'payment',amountCents:100,baseRevision:0}});
   const budget = await new PrismaBudgetRuleRepository(db).create(new BudgetRule(randomUUID(),userId,'2026-01',[],{}));
   const keys = ['read','write','sharing'].map(scope=>createHash('sha256').update(`${scope}:${userId}`).digest('hex'));
   await db.requestBudget.createMany({data:keys.map(key=>({key,count:1,expiresAt:new Date()}))});
   expect(await db.budgetRuleVersion.count({where:{ruleId:budget.id}})).toBeGreaterThan(0);
   expect(await db.transactionSplit.count({where:{transactionId:transaction.id}})).toBe(2);
   const wipe = new DeleteUserFinancialData(db);
   await wipe.execute(userId);
   await wipe.execute(userId);
   expect(await db.transaction.count({where:{userId}})).toBe(0);
   expect(await db.fixedRule.count({where:{userId}})).toBe(0);
   expect(await db.transactionSplit.count({where:{transactionId:transaction.id}})).toBe(0);
   expect(await db.memberConnection.findUnique({where:{id:connection.id}})).toBeNull();
   expect(await db.expenseShare.findUnique({where:{id:share.id}})).toBeNull();
   expect(await db.shareProposal.findUnique({where:{id:proposal.id}})).toBeNull();
   expect(await db.budgetRuleVersion.count({where:{ruleId:budget.id}})).toBe(0);
   expect(await db.requestBudget.count({where:{key:{in:keys}}})).toBe(0);
   expect(await db.category.count({where:{userId}})).toBe(0);
   expect(await db.groupMember.count({where:{userId}})).toBe(0);
   expect(await db.category.findUnique({where:{id:untouched.id}})).not.toBeNull();
  } finally {
   await new DeleteUserFinancialData(db).execute(userId);
   await db.category.deleteMany({where:{userId:otherUser}});
  }
 });
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
 it('updates the category and relational splits together and rolls back an invalid batch', async () => {
  const member = await db.groupMember.create({ data: { userId, name: 'Test', category: 'Amigo' } });
  const category = await db.category.create({ data: { userId, name: 'Mercado', type: 'expense' } });
  const original = new Transaction(randomUUID(), 'Original', 10, 'expense', 'Casa', new Date(), true, 'me', userId, new Date(), null,
   { splits: [{ memberId: 'me', amount: 6 }, { memberId: member.id, amount: 4 }] });
  await repository.create(original);
  const edited = new Transaction(original.id, 'Edited', 12, 'expense', category.name, original.date, true, member.id, userId, original.createdAt, null,
   { splits: [{ memberId: 'me', amount: 7 }, { memberId: member.id, amount: 5 }] }, false, category.id);
  await repository.update(edited);
  expect(await repository.findById(original.id)).toMatchObject({ categoryId: category.id, amount: 12, payer: member.id,
   splitDetails: { splits: expect.arrayContaining([{memberId:'me',amount:7},{memberId:member.id,amount:5}]) } });
  const invalid = new Transaction(randomUUID(), 'Invalid', 1, 'expense', 'Casa', new Date(), true, 'me', userId, new Date(), null,
   {splits:[{memberId:randomUUID(),amount:1}]});
  await expect(repository.updateMany([original, invalid])).rejects.toMatchObject({status:400});
  expect((await repository.findById(original.id))?.amount).toBe(12);
  await repository.update(new Transaction(original.id, 'Individual', 9, 'expense', 'Casa', original.date, false, 'me', userId, original.createdAt));
  expect(await db.transactionSplit.count({where:{transactionId:original.id}})).toBe(0);
 });
 it('serializes two simultaneous creations of the same month', async () => {
  const budgets = new PrismaBudgetRuleRepository(db);
  const make = () => new BudgetRule(randomUUID(), userId, '2026-09', [{id:'one',name:'Total',percentage:100,color:'#ffffff'}], {});
  const [a,b] = await Promise.all([budgets.create(make()),budgets.create(make())]);
  expect(a.id).toBe(b.id);
 });
 it('pages a month with tied dates and calculates exact annual totals without exposing another account', async () => {
  const date = new Date('2026-01-01T00:00:00Z');
  await db.transaction.createMany({data:Array.from({length:105},()=>({id:randomUUID(),userId,date,amount:0.1,
   description:'Page fixture',type:'expense',category:'Casa',payer:'me',isShared:false}))});
  await repository.create(new Transaction(randomUUID(),'Income',1.23,'income','Salário',date,false,'me',userId,new Date()));
  const member = await db.groupMember.create({data:{userId,name:'Friend',category:'Amigo'}});
  await repository.create(new Transaction(randomUUID(),'Shared',0.3,'expense','Casa',date,true,'me',userId,new Date(),null,
   {splits:[{memberId:'me',amount:0.1},{memberId:member.id,amount:0.2}]}));
  const queries = new TransactionQueries(db);
  const first = await queries.page(userId,'2026-01');
  expect(first.items).toHaveLength(100);
  const second = await queries.page(userId,'2026-01',first.nextCursor!);
  expect(second.items).toHaveLength(7);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items,...second.items].map(t=>t.id)).size).toBe(107);
  expect((await queries.annual(userId,2026))[0]).toEqual({month:1,income:1.23,expense:10.6});
  expect(await queries.page(randomUUID(),'2026-01',first.nextCursor!)).toMatchObject({items:[],nextCursor:null});
  expect((await queries.annual(randomUUID(),2026)).every(m=>m.income===0 && m.expense===0)).toBe(true);
  await expect(queries.page(userId,'2026-01','malformed')).rejects.toMatchObject({status:400});
 });
 it('atomically enforces the account sharing budget despite concurrent requests and resets expired windows', async () => {
  const app = express();
  app.use((req,_res,next)=>{(req as any).internalUserId=userId;next();});
  app.use('/sharing',accountRateLimit(db));
  app.post('/sharing',(_req,res)=>{res.json({ok:true});});
  const warn = jest.spyOn(console,'warn').mockImplementation(()=>{});
  try {
   const responses = await Promise.all(Array.from({length:21},()=>request(app).post('/sharing')));
   expect(responses.filter(r=>r.status===200)).toHaveLength(20);
   const limited = responses.filter(r=>r.status===429);
   expect(limited).toHaveLength(1);
   expect(Number(limited[0].headers['retry-after'])).toBeGreaterThan(0);
   const key=createHash('sha256').update(`sharing:${userId}`).digest('hex');
   await db.requestBudget.update({where:{key},data:{expiresAt:new Date(0)}});
   expect((await request(app).post('/sharing')).status).toBe(200);
  } finally {warn.mockRestore();}
 });
 it('generates fixed series by year, keeps deleted months deleted and stops future generation', async () => {
  const original = await new CreateTransaction(repository).execute({userId,description:'Fixed',amount:10,type:'expense',category:'Casa',
   date:new Date('2024-01-31T00:00:00Z'),isShared:false,payer:'me',frequency:'fixed'});
  expect(await db.transaction.count({where:{userId}})).toBe(1);
  const fixed = new FixedRecurrences(db);
  await Promise.all([fixed.ensureYear(userId,2024),fixed.ensureYear(userId,2024)]);
  expect(await db.transaction.count({where:{userId}})).toBe(12);
  const feb = await db.transaction.findFirstOrThrow({where:{userId,occurrenceMonth:'2024-02'}});
  expect(feb.date.toISOString().slice(0,10)).toBe('2024-02-29');
  await repository.delete(feb.id);
  await fixed.ensureYear(userId,2024);
  expect(await repository.findById(feb.id)).toBeNull();
  expect((await new TransactionQueries(db).annual(userId,2024))[1].expense).toBe(0);
  const september = await db.transaction.findFirstOrThrow({where:{userId,occurrenceMonth:'2024-09'}});
  await new UpdateTransaction(repository).execute(september.id,{userId,description:'Changed',amount:20,type:'expense',category:'Casa',
   date:september.date,isShared:false,payer:'me'});
  await fixed.ensureYear(userId,2025);
  const march = await db.transaction.findFirstOrThrow({where:{userId,occurrenceMonth:'2025-03'}});
  expect(Number(march.amount)).toBe(20);
  expect(march.date.toISOString().slice(0,10)).toBe('2025-03-31');
  await fixed.stop(userId,march.id);
  await fixed.ensureYear(userId,2026);
  expect(await repository.findByUserId(userId,2025)).toHaveLength(2);
  expect(await repository.findByUserId(userId,2026)).toHaveLength(0);
  expect((await repository.findById(original.id))?.amount).toBe(10);
 });
});
