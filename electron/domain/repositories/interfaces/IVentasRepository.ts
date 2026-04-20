import { Result } from '../../common/Result';

export interface DetalleVenta {
  id?: number;
  venta_id?: number;
  tipo: 'producto' | 'servicio' | string;
  ref_id: number;
  nombre: string;
  cantidad: number;
  cantidad_hojas_gastadas?: number;
  precio_unitario_usd: number;
  subtotal_usd: number;
  insumo_id?: number | null; // Needed context for servicios stock deduction
}

export interface Pago {
  id?: number;
  venta_id?: number;
  metodo: string;
  monto_usd: number;
  monto_ves?: number;
  fecha?: string;
}

export interface Abono {
  id?: number;
  venta_id?: number;
  metodo: string;
  monto_usd: number;
  monto_ves?: number;
  fecha?: string;
}

export interface Venta {
  id: number;
  fecha: string;
  subtotal_usd: number;
  descuento_otorgado_usd: number;
  total_usd: number;
  tasa_cambio: number;
  estado: 'pagada' | 'pendiente' | 'anulada' | string;
  cliente_nombre: string;
  saldo_pendiente_usd: number;
  notas: string;
  
  detalles?: DetalleVenta[];
  pagos?: Pago[];
  abonos?: Abono[];
}

export interface VentasFilters {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
}

export interface VentasPaginationParams {
  page: number;
  perPage: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
}

export interface PaginatedVentas {
  ventas: Venta[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface IVentasRepository {
  create(venta: Omit<Venta, 'id' | 'fecha' | 'detalles' | 'pagos' | 'abonos'>): Promise<Result<number>>;
  addDetalle(ventaId: number, detalle: DetalleVenta): Promise<Result<void>>;
  addPago(ventaId: number, pago: Pago): Promise<Result<void>>;
  
  list(filters: VentasFilters): Promise<Result<Venta[]>>;
  getById(id: number): Promise<Result<Venta | null>>;
  ultimas(limit: number): Promise<Result<Venta[]>>;
  paginate(params: VentasPaginationParams): Promise<Result<PaginatedVentas>>;
}
