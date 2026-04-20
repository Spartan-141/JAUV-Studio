import { ipcMain } from 'electron';
import { CategoriaUseCases } from '../../../application/use-cases/categorias/CategoriasUseCases';

export class CategoriasIpcController {
  constructor(private useCases: CategoriaUseCases) {}

  public register(): void {
    ipcMain.handle('categorias:list', async () => {
      const result = await this.useCases.listCategorias();
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('categorias:create', async (_e, data) => {
      const result = await this.useCases.createCategoria(data);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('categorias:update', async (_e, data) => {
      const result = await this.useCases.updateCategoria(data);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('categorias:delete', async (_e, id: number) => {
      const result = await this.useCases.deleteCategoria(id);
      if (!result.isSuccess) throw result.getError();
      return true;
    });

    ipcMain.handle('categorias:productos', async (_e, categoria_id: number) => {
      const result = await this.useCases.listProductosPorCategoria(categoria_id);
      if (!result.isSuccess) throw result.getError();
      return result.getValue();
    });

    ipcMain.handle('categorias:bulk_assign', async (_e, data) => {
      const result = await this.useCases.bulkAssignProductos(data);
      if (!result.isSuccess) throw result.getError();
      return true;
    });
  }
}
