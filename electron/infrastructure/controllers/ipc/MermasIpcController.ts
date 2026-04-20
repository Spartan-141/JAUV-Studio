import { ipcMain } from 'electron';
import { MermasUseCases } from '../../../application/use-cases/mermas/MermasUseCases';

export class MermasIpcController {
  constructor(private useCases: MermasUseCases) {}

  public register(): void {
    ipcMain.handle('mermas:list', async () => {
      const result = await this.useCases.listMermas();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('mermas:create', async (_e, data) => {
      const result = await this.useCases.createMerma(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
