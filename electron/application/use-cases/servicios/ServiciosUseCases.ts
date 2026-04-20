import { IServiciosRepository, Servicio } from '../../../domain/repositories/interfaces/IServiciosRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { z } from 'zod';

export const ServicioBaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  precio_usd: z.number().min(0, 'El precio USD no puede ser negativo'),
  precio_ves: z.number().min(0, 'El precio VES no puede ser negativo').optional().default(0),
  moneda_precio: z.string().optional().default('usd'),
  insumo_id: z.number().nullable().optional().transform(v => v === undefined ? null : v),
  activo: z.union([z.boolean(), z.number()]).optional().default(1),
});

export const CrearServicioSchema = ServicioBaseSchema;
export const ActualizarServicioSchema = ServicioBaseSchema.extend({
  id: z.number().int().positive()
});

export class ServiciosUseCases {
  constructor(private repo: IServiciosRepository) {}

  async listServicios(): Promise<Result<Servicio[]>> {
    return this.repo.getAll();
  }

  async createServicio(data: unknown): Promise<Result<{ id: number }>> {
    const valid = CrearServicioSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.create(valid.data);
  }

  async updateServicio(data: unknown): Promise<Result<void>> {
    const valid = ActualizarServicioSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    
    const { id, ...payload } = valid.data;
    return this.repo.update(id, payload);
  }

  async deleteServicio(id: number): Promise<Result<void>> {
    if (!id || id <= 0) return ResultFactory.fail(new Error('ID inválido'));
    return this.repo.delete(id);
  }

  async searchServicios(query: string): Promise<Result<Servicio[]>> {
    if (!query) return ResultFactory.ok([]);
    return this.repo.search(query);
  }
}
