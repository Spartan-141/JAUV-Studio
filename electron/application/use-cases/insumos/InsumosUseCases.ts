import { IInsumosRepository, Insumo } from '../../../domain/repositories/interfaces/IInsumosRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { z } from 'zod';

export const InsumoBaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  tipo: z.string(),
  stock_hojas: z.number().int().min(0, 'El stock no puede ser negativo'),
  stock_minimo: z.number().int().min(0, 'El stock mínimo no puede ser negativo'),
  costo_por_hoja_usd: z.number().min(0, 'El costo no puede ser negativo')
});

export const CrearInsumoSchema = InsumoBaseSchema;
export const ActualizarInsumoSchema = InsumoBaseSchema.extend({
  id: z.number().int().positive()
});

export const AjustarStockSchema = z.object({
  id: z.number().int().positive(),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  operacion: z.enum(['sumar', 'restar'])
});

export class InsumosUseCases {
  constructor(private repo: IInsumosRepository) {}

  async listInsumos(): Promise<Result<Insumo[]>> {
    return this.repo.getAll();
  }

  async createInsumo(data: unknown): Promise<Result<{ id: number }>> {
    const valid = CrearInsumoSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.create(valid.data);
  }

  async updateInsumo(data: unknown): Promise<Result<void>> {
    const valid = ActualizarInsumoSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    
    const { id, ...payload } = valid.data;
    return this.repo.update(id, payload);
  }

  async deleteInsumo(id: number): Promise<Result<void>> {
    if (!id || id <= 0) return ResultFactory.fail(new Error('ID inválido'));
    return this.repo.delete(id);
  }

  async ajustarStock(data: unknown): Promise<Result<{ stock_hojas: number }>> {
    const valid = AjustarStockSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.ajustarStock(valid.data.id, valid.data.cantidad, valid.data.operacion);
  }
}
