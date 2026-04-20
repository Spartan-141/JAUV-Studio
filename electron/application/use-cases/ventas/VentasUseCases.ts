import { IVentasRepository, Venta, DetalleVenta, Pago, VentasFilters, VentasPaginationParams, PaginatedVentas } from '../../../domain/repositories/interfaces/IVentasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { IUnitOfWork } from '../../interfaces/IUnitOfWork';
import { z } from 'zod';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const DetalleVentaSchema = z.object({
  tipo: z.string().min(1),
  ref_id: z.number().int().positive(),
  nombre: z.string().min(1),
  cantidad: z.number().int().positive(),
  cantidad_hojas_gastadas: z.number().int().min(0).optional().default(0),
  precio_unitario: z.number().min(0),
  subtotal: z.number().min(0),
  insumo_id: z.number().nullable().optional().transform(v => v ?? null),
});

const PagoSchema = z.object({
  metodo: z.string().min(1),
  monto: z.number().min(0),
});

const CabeceraVentaSchema = z.object({
  subtotal: z.number().min(0),
  descuento_otorgado: z.number().min(0).optional().default(0),
  total: z.number().min(0),
  estado: z.string().default('pagada'),
  cliente_nombre: z.string().optional().default(''),
  saldo_pendiente: z.number().min(0).optional().default(0),
  notas: z.string().optional().default(''),
});

export const CrearVentaSchema = z.object({
  cabecera: CabeceraVentaSchema,
  detalles: z.array(DetalleVentaSchema).min(1, 'Debe incluir al menos un producto o servicio'),
  pagos: z.array(PagoSchema).min(1, 'Debe incluir al menos un pago'),
});

// ─── Use Cases ──────────────────────────────────────────────────────────────

import { IProductosRepository } from '../../../domain/repositories/interfaces/IProductosRepository';
import { IInsumosRepository } from '../../../domain/repositories/interfaces/IInsumosRepository';

export class VentasUseCases {
  constructor(
    private repo: IVentasRepository,
    private uow: IUnitOfWork,
    private productosRepo: IProductosRepository,
    private insumosRepo: IInsumosRepository
  ) {}

  /**
   * Creates a complete sale transactionally:
   * 1. Insert venta header
   * 2. Insert line items + deduct stock from productos/insumos
   * 3. Insert payment records
   *
   * All within a single SQLite transaction to guarantee atomicity.
   */
  async crearVenta(payload: unknown): Promise<Result<{ id: number }>> {
    const parsed = CrearVentaSchema.safeParse(payload);
    if (!parsed.success) return ResultFactory.fail(new Error(parsed.error.message));

    const { cabecera, detalles, pagos } = parsed.data;

    try {
      await this.uow.start();

      // 1. Insert sale header
      const insertResult = await this.repo.create(cabecera as any);
      if (!insertResult.isSuccess) {
        await this.uow.rollback();
        return ResultFactory.fail(insertResult.getError()!);
      }
      const ventaId = insertResult.getValue()!;

      // 2. Insert line items & deduct stock
      for (const item of detalles) {
        const detResult = await this.repo.addDetalle(ventaId, item as DetalleVenta);
        if (!detResult.isSuccess) {
          await this.uow.rollback();
          return ResultFactory.fail(detResult.getError()!);
        }

        if (item.tipo === 'producto') {
           const prodResult = await this.productosRepo.getById(item.ref_id);
           if (prodResult.isSuccess && prodResult.getValue()) {
             const prod = prodResult.getValue();
             const newStock = Math.max(0, prod.stock_actual - item.cantidad);
             await this.productosRepo.update(item.ref_id, { ...prod, stock_actual: newStock });
           }
        } else if (item.tipo === 'servicio' && item.insumo_id) {
           const hojas = item.cantidad_hojas_gastadas || item.cantidad;
           await this.insumosRepo.ajustarStock(item.insumo_id, hojas, 'restar');
        }
      }

      // 3. Insert payments
      for (const pago of pagos) {
        const pagoResult = await this.repo.addPago(ventaId, pago as Pago);
        if (!pagoResult.isSuccess) {
          await this.uow.rollback();
          return ResultFactory.fail(pagoResult.getError()!);
        }
      }

      await this.uow.commit();
      return ResultFactory.ok({ id: ventaId });
    } catch (err) {
      await this.uow.rollback();
      return ResultFactory.fail(err instanceof Error ? err : String(err));
    }
  }

  async listVentas(filters: VentasFilters): Promise<Result<Venta[]>> {
    return this.repo.list(filters);
  }

  async getVentaById(id: number): Promise<Result<Venta | null>> {
    if (!id || id <= 0) return ResultFactory.fail(new Error('ID de venta inválido'));
    return this.repo.getById(id);
  }

  async getUltimasVentas(limit: number = 20): Promise<Result<Venta[]>> {
    return this.repo.ultimas(limit);
  }

  async getVentasPaginated(params: VentasPaginationParams): Promise<Result<PaginatedVentas>> {
    return this.repo.paginate(params);
  }
}
