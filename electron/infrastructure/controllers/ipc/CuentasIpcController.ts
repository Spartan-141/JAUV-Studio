import { ipcMain } from 'electron';
import { CuentasUseCases } from '../../../application/use-cases/cuentas/CuentasUseCases';

export class CuentasIpcController {
  constructor(private useCases: CuentasUseCases) {}

  public register(): void {
    ipcMain.handle('cuentas:list', async () => {
      const result = await this.useCases.getCuentas();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('cuentas:get', async (_e, id: number) => {
      const result = await this.useCases.getCuentaDetalle(id);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('cuentas:abonar', async (_e, data) => {
      const result = await this.useCases.registrarAbono(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('cuentas:ajustar_deuda', async (_e, data) => {
      const result = await this.useCases.ajustarDeuda(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('cuentas:sincronizar_precio', async (_e, data) => {
      const result = await this.useCases.sincronizarPrecioArticulo(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
