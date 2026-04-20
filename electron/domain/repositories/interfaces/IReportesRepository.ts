import { Result } from '../../common/Result';

export interface ReporteDiaBasico {
  total_ventas: number;
  ingresos: number;
  descuentos: number;
  pendiente_cobrar: number;
  ganancia_neta: number;
  pagos: any[];
  abonos: any[];
  ventas: any[];
}



export interface InventarioStats {
  total_productos: number;
  total_articulos: number;
  inversion: number;
  ganancia_potencial: number;
}

export interface IReportesRepository {
  getHoy(fecha: string): Promise<Result<ReporteDiaBasico>>;
  getInventario(): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>>;
  getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>>;
}
