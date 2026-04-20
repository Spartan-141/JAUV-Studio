import { IReportesRepository, InventarioStats, ReporteDiaBasico } from '../../../domain/repositories/interfaces/IReportesRepository';
import { Result } from '../../../domain/common/Result';

export class ReportesUseCases {
  constructor(private repo: IReportesRepository) {}

  async getReporteHoy(fecha: string): Promise<Result<ReporteDiaBasico>> {
    return this.repo.getHoy(fecha);
  }



  async getInventarioStats(): Promise<Result<{ stats: InventarioStats; bajo_stock: any[] }>> {
    return this.repo.getInventario();
  }

  async getDashboardMetrics(): Promise<Result<{ trend: any[]; top_productos: any[]; top_deudores: any[] }>> {
    return this.repo.getDashboardMetrics();
  }


}
