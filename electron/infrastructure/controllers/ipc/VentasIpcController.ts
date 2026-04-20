import { ipcMain } from 'electron';
import { VentasUseCases } from '../../../application/use-cases/ventas/VentasUseCases';
import { Database } from '../../database/connection/Database';

/**
 * VentasIpcController
 *
 * Thin adapter layer. The stock-deduction SQL lives here (not in the UseCase)
 * because it touches two different aggregate roots (Productos and Insumos)
 * and we want the UseCase to stay focused on the Ventas aggregate.
 *
 * The entire flow is wrapped in the UnitOfWork transaction started by the UseCase.
 */
export class VentasIpcController {
  constructor(
    private useCases: VentasUseCases
  ) {}

  public register(): void {

    ipcMain.handle('ventas:create', async (_e, payload) => {
      const result = await this.useCases.crearVenta(payload);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('ventas:list', async (_e, filters = {}) => {
      const result = await this.useCases.listVentas(filters);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('ventas:get', async (_e, id: number) => {
      const result = await this.useCases.getVentaById(id);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('ventas:ultimas', async (_e, limit: number = 20) => {
      const result = await this.useCases.getUltimasVentas(limit);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('ventas:paginated', async (_e, params = {}) => {
      const finalParams = {
        page: params.page || 1,
        perPage: params.perPage || 25,
        fechaDesde: params.fechaDesde || '',
        fechaHasta: params.fechaHasta || '',
        estado: params.estado || '',
      };
      const result = await this.useCases.getVentasPaginated(finalParams);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
