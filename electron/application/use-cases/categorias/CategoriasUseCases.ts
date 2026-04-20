import { ICategoriasRepository, Categoria, ProductoSimple } from '../../../domain/repositories/interfaces/ICategoriasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { z } from 'zod';

export const CrearCategoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la categoría es requerido')
});

export const ActualizarCategoriaSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1, 'El nombre de la categoría es requerido')
});

export const BulkAssignSchema = z.object({
  categoria_id: z.number().int().positive(),
  producto_ids: z.array(z.number().int().positive())
});

export class CategoriaUseCases {
  constructor(private repo: ICategoriasRepository) {}

  async listCategorias(): Promise<Result<Categoria[]>> {
    return this.repo.getAll();
  }

  async createCategoria(data: unknown): Promise<Result<{ id: number; nombre: string }>> {
    const valid = CrearCategoriaSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.create(valid.data.nombre);
  }

  async updateCategoria(data: unknown): Promise<Result<void>> {
    const valid = ActualizarCategoriaSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.update(valid.data.id, valid.data.nombre);
  }

  async deleteCategoria(id: number): Promise<Result<void>> {
    if (!id || id <= 0) return ResultFactory.fail(new Error('ID inválido'));
    return this.repo.delete(id);
  }

  async listProductosPorCategoria(categoria_id: number): Promise<Result<ProductoSimple[]>> {
    return this.repo.getAllProductos();
  }

  async bulkAssignProductos(data: unknown): Promise<Result<void>> {
    const valid = BulkAssignSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    return this.repo.bulkAssignProductos(valid.data.categoria_id, valid.data.producto_ids);
  }
}

