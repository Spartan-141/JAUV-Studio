import { ipcMain } from 'electron';
import { ObtenerConfigUseCase, ActualizarConfigUseCase } from '../../../application/use-cases/config/ConfigUseCases';

export class ConfigIpcController {
  constructor(
    private obtenerConfigUseCase: ObtenerConfigUseCase,
    private actualizarConfigUseCase: ActualizarConfigUseCase
  ) {}

  public register(): void {
    ipcMain.handle('config:getAll', async () => {
      const result = await this.obtenerConfigUseCase.execute();
      if (result.isSuccess) {
        return result.getValue();
      } else {
        throw result.getError();
      }
    });

    ipcMain.handle('config:set', async (_event, clave: string, valor: string) => {
      const result = await this.actualizarConfigUseCase.execute({ [clave]: String(valor) });
      if (result.isSuccess) {
        return true;
      } else {
        throw result.getError();
      }
    });
  }
}
