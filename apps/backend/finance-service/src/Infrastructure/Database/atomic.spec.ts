import { Prisma, PrismaClient } from '@prisma/client';
import { atomic } from './atomic';

describe('Definite transaction rollback retries', () => {
    function adapterError(code: string) { return Object.assign(new Error('Transaction failed'), {name:'DriverAdapterError',cause:{originalCode:code}}); }
    it.each(['40001','40P01'])('retries adapter commit conflict %s without losing the result', async code => {
        const $transaction=jest.fn().mockRejectedValueOnce(adapterError(code)).mockResolvedValue('committed');
        expect(await atomic({$transaction} as unknown as PrismaClient,async()=>undefined)).toBe('committed');
        expect($transaction).toHaveBeenCalledTimes(2);
    });
    it('bounds retries of Prisma serialization failures', async()=>{
        const error=new Prisma.PrismaClientKnownRequestError('Conflict',{code:'P2034',clientVersion:'test'});
        const $transaction=jest.fn().mockRejectedValue(error);
        await expect(atomic({$transaction} as unknown as PrismaClient,async()=>undefined)).rejects.toBe(error);
        expect($transaction).toHaveBeenCalledTimes(4);
    });
    it('does not repeat a write whose connection failed with an unknown commit outcome',async()=>{
        const error=adapterError('ECONNRESET');
        const $transaction=jest.fn().mockRejectedValue(error);
        await expect(atomic({$transaction} as unknown as PrismaClient,async()=>undefined)).rejects.toBe(error);
        expect($transaction).toHaveBeenCalledTimes(1);
    });
});
