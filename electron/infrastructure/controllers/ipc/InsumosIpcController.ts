import { ipcMain } from 'electron';
import { InsumosUseCases } from '../../../application/use-cases/insumos/InsumosUseCases';

export class InsumosIpcController {
  constructor(private useCases: InsumosUseCases) {}

  public register(): void {
    ipcMain.handle('insumos:list', async () => {
      const result = await this.useCases.listInsumos();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('insumos:create', async (_e, data) => {
      const result = await this.useCases.createInsumo(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('insumos:update', async (_e, data) => {
      const result = await this.useCases.updateInsumo(data);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('insumos:delete', async (_e, id: number) => {
      const result = await this.useCases.deleteInsumo(id);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('insumos:ajustar', async (_e, data) => {
      const result = await this.useCases.ajustarStock(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
