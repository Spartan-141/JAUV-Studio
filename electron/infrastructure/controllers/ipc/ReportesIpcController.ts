import { ipcMain } from 'electron';
import { ReportesUseCases } from '../../../application/use-cases/reportes/ReportesUseCases';

export class ReportesIpcController {
  constructor(private useCases: ReportesUseCases) {}

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  public register(): void {
    ipcMain.handle('reportes:hoy', async () => {
      const fecha = this.todayStr();
      const result = await this.useCases.getReporteHoy(fecha);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });



    ipcMain.handle('reportes:inventario', async () => {
      const result = await this.useCases.getInventarioStats();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('dashboard:metrics', async () => {
      const result = await this.useCases.getDashboardMetrics();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
