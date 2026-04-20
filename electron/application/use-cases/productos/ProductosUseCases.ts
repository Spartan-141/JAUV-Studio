import { IProductosRepository, Producto, ProductoFilters } from '../../../domain/repositories/interfaces/IProductosRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { GeneradorCodigoBarras } from '../../../domain/services/GeneradorCodigoBarras';
import { z } from 'zod';

export const ProductoBaseSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  marca: z.string().optional().default(''),
  precio_compra: z.number().min(0).optional().default(0),
  precio_venta: z.number().min(0).optional().default(0),
  stock_actual: z.number().int().min(0).optional().default(0),
  stock_minimo: z.number().int().min(0).optional().default(0),
  categoria_id: z.number().nullable().optional().transform(v => v === undefined ? null : v),
  descripcion: z.string().optional().default('')
});

export const CrearProductoSchema = ProductoBaseSchema;

export const ActualizarProductoSchema = ProductoBaseSchema.extend({
  id: z.number().int().positive()
});

export class ProductosUseCases {
  constructor(
    private repo: IProductosRepository,
    private generadorCodigo: GeneradorCodigoBarras
  ) {}

  async listProductos(filters: ProductoFilters): Promise<Result<Producto[]>> {
    return this.repo.list(filters);
  }

  async getProductoById(id: number): Promise<Result<Producto>> {
    if (!id || id <= 0) return ResultFactory.fail(new Error('ID inválido'));
    return this.repo.getById(id);
  }

  async createProducto(data: unknown): Promise<Result<{ id: number; codigo: string }>> {
    const valid = CrearProductoSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    
    const payload = valid.data;
    if (!payload.codigo || payload.codigo.trim() === '') {
      payload.codigo = await this.generadorCodigo.generateUniqueCode();
    } else {
      payload.codigo = payload.codigo.trim();
      const codeExistsMsg = await this.repo.codeExists(payload.codigo);
      if (codeExistsMsg.isSuccess && codeExistsMsg.getValue()) {
        return ResultFactory.fail(new Error('El código ingresado ya está en uso.'));
      }
    }

    return this.repo.create(payload as any);
  }

  async updateProducto(data: unknown): Promise<Result<void>> {
    const valid = ActualizarProductoSchema.safeParse(data);
    if (!valid.success) return ResultFactory.fail(new Error(valid.error.message));
    
    const { id, ...payload } = valid.data;
    if (payload.codigo) payload.codigo = payload.codigo.trim();
    
    return this.repo.update(id, payload as any);
  }

  async deleteProducto(id: number): Promise<Result<void>> {
    if (!id || id <= 0) return ResultFactory.fail(new Error('ID inválido'));
    return this.repo.delete(id);
  }

  async searchProductos(query: string): Promise<Result<Producto[]>> {
    if (!query || query.trim() === '') return ResultFactory.ok([]);
    return this.repo.search(query);
  }
}
