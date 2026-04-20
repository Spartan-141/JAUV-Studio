import { Result } from '../../common/Result';

export interface ReporteDiaBasico {
  total_ventas: number;
  ingresos_usd: number;
  ingresos_ves: number;
  descuentos_usd: number;
  pendiente_cobrar_usd: number;
  ganancia_neta_usd: number;
  pagos: any[];
  abonos: any[];
  ventas: any[];
}

export interface CierreDia extends ReporteDiaBasico {
  cerrado?: boolean;
  cerrado_en?: string | null;
  tasa_cierre?: number | null;
  fecha: string;
}

export interface CierreDiaHistorico {
  id: number;
  fecha: string;
  tasa_cierre: number;
  total_ventas: number;
  ingresos_usd: number;
  ingresos_ves: number;
  cerrado_en: string;
}

export interface InventarioStats {
  total_productos: number;
  total_articulos: number;
  inversion_usd: number;
  ganancia_potencial_usd: number;
}

export interface IReportesRepository {
  buildDayData(fecha: string): Promise<Result<ReporteDiaBasico>>;
  upsertCierre(fecha: string, tasa: number): Promise<Result<ReporteDiaBasico>>;
  
  getHoy(fecha: string): Promise<Result<CierreDia>>;
  getHistorial(): Promise<Result<CierreDiaHistorico[]>>;
  getCierreDetalle(fecha: string): Promise<Result<any>>;
  
  getInventario(tasa: number): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>>;
  getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>>;
  autoClosePreviousDays(): Promise<void>;
}
