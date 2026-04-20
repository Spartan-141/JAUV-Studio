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

export interface CierreDia extends ReporteDiaBasico {
  cerrado?: boolean;
  cerrado_en?: string | null;
  fecha: string;
}

export interface CierreDiaHistorico {
  id: number;
  fecha: string;
  total_ventas: number;
  ingresos: number;
  cerrado_en: string;
}

export interface InventarioStats {
  total_productos: number;
  total_articulos: number;
  inversion: number;
  ganancia_potencial: number;
}

export interface IReportesRepository {
  buildDayData(fecha: string): Promise<Result<ReporteDiaBasico>>;
  upsertCierre(fecha: string): Promise<Result<ReporteDiaBasico>>;
  
  getHoy(fecha: string): Promise<Result<CierreDia>>;
  getHistorial(): Promise<Result<CierreDiaHistorico[]>>;
  getCierreDetalle(fecha: string): Promise<Result<any>>;
  
  getInventario(): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>>;
  getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>>;
  autoClosePreviousDays(): Promise<void>;
}
