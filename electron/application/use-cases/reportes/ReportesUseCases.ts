import { IReportesRepository, CierreDia, CierreDiaHistorico, InventarioStats } from '../../../domain/repositories/interfaces/IReportesRepository';
import { Result } from '../../../domain/common/Result';

export class ReportesUseCases {
  constructor(private repo: IReportesRepository) {}

  async getReporteHoy(fecha: string): Promise<Result<CierreDia>> {
    return this.repo.getHoy(fecha);
  }

  async cerrarDia(fecha: string, tasa: number): Promise<Result<any>> {
    return this.repo.upsertCierre(fecha, tasa);
  }

  async getHistorialCierres(): Promise<Result<CierreDiaHistorico[]>> {
    return this.repo.getHistorial();
  }

  async getCierreDetalle(fecha: string): Promise<Result<any>> {
    return this.repo.getCierreDetalle(fecha);
  }

  async getInventarioStats(tasa: number): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>> {
    return this.repo.getInventario(tasa);
  }

  async getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>> {
    return this.repo.getDashboardMetrics();
  }

  async executeAutoClosePreviousDays(): Promise<void> {
    await this.repo.autoClosePreviousDays();
  }
}
