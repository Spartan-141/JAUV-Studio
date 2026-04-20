import { ipcMain } from 'electron';
import { ServiciosUseCases } from '../../../application/use-cases/servicios/ServiciosUseCases';

export class ServiciosIpcController {
  constructor(private useCases: ServiciosUseCases) {}

  public register(): void {
    ipcMain.handle('servicios:list', async () => {
      const result = await this.useCases.listServicios();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('servicios:create', async (_e, data) => {
      const result = await this.useCases.createServicio(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('servicios:update', async (_e, data) => {
      const result = await this.useCases.updateServicio(data);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('servicios:delete', async (_e, id: number) => {
      const result = await this.useCases.deleteServicio(id);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('servicios:search', async (_e, query: string) => {
      const result = await this.useCases.searchServicios(query);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
