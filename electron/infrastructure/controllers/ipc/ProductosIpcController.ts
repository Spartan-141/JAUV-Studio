import { ipcMain } from 'electron';
import { ProductosUseCases } from '../../../application/use-cases/productos/ProductosUseCases';

export class ProductosIpcController {
  constructor(private useCases: ProductosUseCases) {}

  public register(): void {
    ipcMain.handle('productos:list', async (_e, filters = {}) => {
      const result = await this.useCases.listProductos(filters);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('productos:get', async (_e, id: number) => {
      const result = await this.useCases.getProductoById(id);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('productos:create', async (_e, data) => {
      const result = await this.useCases.createProducto(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('productos:update', async (_e, data) => {
      const result = await this.useCases.updateProducto(data);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('productos:delete', async (_e, id: number) => {
      const result = await this.useCases.deleteProducto(id);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('productos:search', async (_e, query: string) => {
      const result = await this.useCases.searchProductos(query);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });
  }
}
