import { IMermasRepository, Merma } from '../../../domain/repositories/interfaces/IMermasRepository';
import { IProductosRepository } from '../../../domain/repositories/interfaces/IProductosRepository';
import { IInsumosRepository } from '../../../domain/repositories/interfaces/IInsumosRepository';
import { IUnitOfWork } from '../../interfaces/IUnitOfWork';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { z } from 'zod';

export const CrearMermaSchema = z.object({
  producto_id: z.number().int().positive().nullable().optional().transform(v => v ?? null),
  insumo_id: z.number().int().positive().nullable().optional().transform(v => v ?? null),
  cantidad: z.number().min(0.0001, 'La cantidad debe ser mayor a 0'),
  motivo: z.string().min(1, 'Debe especificar el motivo'),
  notas: z.string().optional().default('')
}).refine(data => data.producto_id !== null || data.insumo_id !== null, {
  message: 'Debe especificar el producto o el insumo de la merma',
  path: ['producto_id']
});

export class MermasUseCases {
  constructor(
    private repo: IMermasRepository,
    private uow: IUnitOfWork,
    private productosRepo: IProductosRepository,
    private insumosRepo: IInsumosRepository
  ) {}

  async listMermas(): Promise<Result<Merma[]>> {
    return this.repo.list();
  }

  async createMerma(data: unknown): Promise<Result<{ id: number }>> {
    const valid = CrearMermaSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));

    const payload = valid.data;

    try {
      await this.uow.start();

      // 1. Create merma record
      const resultMerma = await this.repo.create(payload);
      if (!resultMerma.isSuccess) {
        await this.uow.rollback();
        return resultMerma;
      }
      
      const mermaId = resultMerma.getValue()!.id;

      // 2. Adjust Stock
      if (payload.producto_id) {
        const prodResult = await this.productosRepo.getById(payload.producto_id);
        if (prodResult.isSuccess && prodResult.getValue()) {
          const prod = prodResult.getValue()!;
          const newStock = Math.max(0, prod.stock_actual - payload.cantidad);
          await this.productosRepo.update(payload.producto_id, { ...prod, stock_actual: newStock });
        }
      }
      
      if (payload.insumo_id) {
        await this.insumosRepo.ajustarStock(payload.insumo_id, payload.cantidad, 'restar');
      }

      await this.uow.commit();
      return ResultFactory.ok({ id: mermaId });
    } catch (err) {
      await this.uow.rollback();
      return ResultFactory.fail(err instanceof Error ? err : String(err));
    }
  }
}
