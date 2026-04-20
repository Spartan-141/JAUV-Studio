import { IReportesRepository, CierreDia, CierreDiaHistorico, InventarioStats } from '../../../domain/repositories/interfaces/IReportesRepository';
import { Result } from '../../../domain/common/Result';

export class ReportesUseCases {
  constructor(private repo: IReportesRepository) {}

  async getReporteHoy(fecha: string): Promise<Result<CierreDia>> {
    return this.repo.getHoy(fecha);
  }

  async cerrarDia(fecha: string): Promise<Result<any>> {
    return this.repo.upsertCierre(fecha);
  }

  async getHistorialCierres(): Promise<Result<CierreDiaHistorico[]>> {
    return this.repo.getHistorial();
  }

  async getCierreDetalle(fecha: string): Promise<Result<any>> {
    return this.repo.getCierreDetalle(fecha);
  }

  async getInventarioStats(): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>> {
    return this.repo.getInventario();
  }

  async getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>> {
    return this.repo.getDashboardMetrics();
  }

  async executeAutoClosePreviousDays(): Promise<void> {
    await this.repo.autoClosePreviousDays();
  }
}
