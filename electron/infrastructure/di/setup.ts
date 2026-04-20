import { container } from './container';
import { Database } from '../database/connection/Database';
import { SqliteConfigRepository } from '../database/repositories/SqliteConfigRepository';
import { ObtenerConfigUseCase, ActualizarConfigUseCase } from '../../application/use-cases/config/ConfigUseCases';
import { ConfigIpcController } from '../controllers/ipc/ConfigIpcController';
import { SqliteCategoriasRepository } from '../database/repositories/SqliteCategoriasRepository';
import { CategoriaUseCases } from '../../application/use-cases/categorias/CategoriasUseCases';
import { CategoriasIpcController } from '../controllers/ipc/CategoriasIpcController';
import { SqliteInsumosRepository } from '../database/repositories/SqliteInsumosRepository';
import { InsumosUseCases } from '../../application/use-cases/insumos/InsumosUseCases';
import { InsumosIpcController } from '../controllers/ipc/InsumosIpcController';
import { SqliteServiciosRepository } from '../database/repositories/SqliteServiciosRepository';
import { ServiciosUseCases } from '../../application/use-cases/servicios/ServiciosUseCases';
import { ServiciosIpcController } from '../controllers/ipc/ServiciosIpcController';
import { SqliteProductosRepository } from '../database/repositories/SqliteProductosRepository';
import { GeneradorCodigoBarras } from '../../domain/services/GeneradorCodigoBarras';
import { ProductosUseCases } from '../../application/use-cases/productos/ProductosUseCases';
import { ProductosIpcController } from '../controllers/ipc/ProductosIpcController';
import { SqliteUnitOfWork } from '../database/connection/Database';
import { SqliteVentasRepository } from '../database/repositories/SqliteVentasRepository';
import { VentasUseCases } from '../../application/use-cases/ventas/VentasUseCases';
import { VentasIpcController } from '../controllers/ipc/VentasIpcController';
import { SqliteCuentasRepository } from '../database/repositories/SqliteCuentasRepository';
import { CuentasUseCases } from '../../application/use-cases/cuentas/CuentasUseCases';
import { CuentasIpcController } from '../controllers/ipc/CuentasIpcController';
import { SqliteMermasRepository } from '../database/repositories/SqliteMermasRepository';
import { MermasUseCases } from '../../application/use-cases/mermas/MermasUseCases';
import { MermasIpcController } from '../controllers/ipc/MermasIpcController';
import { SqliteReportesRepository } from '../database/repositories/SqliteReportesRepository';
import { ReportesUseCases } from '../../application/use-cases/reportes/ReportesUseCases';
import { ReportesIpcController } from '../controllers/ipc/ReportesIpcController';

export function setupDI(): void {
  // 1. Singletons and Infrastructure
  const db = Database.getInstance();
  const uow = new SqliteUnitOfWork(db);

  container.register('Database', db);
  container.register('IUnitOfWork', uow);

  // 2. Repositories
  const configRepo = new SqliteConfigRepository(db);
  container.register('IConfigRepository', configRepo);

  // 3. Use Cases
  const obtenerConfigUseCase = new ObtenerConfigUseCase(configRepo);
  container.register('ObtenerConfigUseCase', obtenerConfigUseCase);

  const actualizarConfigUseCase = new ActualizarConfigUseCase(configRepo);
  container.register('ActualizarConfigUseCase', actualizarConfigUseCase);

  // 4. Controllers
  const configController = new ConfigIpcController(obtenerConfigUseCase, actualizarConfigUseCase);
  container.register('ConfigIpcController', configController);

  // Categorias Registry
  const categoriasRepo = new SqliteCategoriasRepository(db);
  container.register('ICategoriasRepository', categoriasRepo);
  const categoriaUseCases = new CategoriaUseCases(categoriasRepo);
  container.register('CategoriaUseCases', categoriaUseCases);
  const categoriasController = new CategoriasIpcController(categoriaUseCases);
  container.register('CategoriasIpcController', categoriasController);

  // Insumos Registry
  const insumosRepo = new SqliteInsumosRepository(db);
  container.register('IInsumosRepository', insumosRepo);
  const insumosUseCases = new InsumosUseCases(insumosRepo);
  container.register('InsumosUseCases', insumosUseCases);
  const insumosController = new InsumosIpcController(insumosUseCases);
  container.register('InsumosIpcController', insumosController);

  // Servicios Registry
  const serviciosRepo = new SqliteServiciosRepository(db);
  container.register('IServiciosRepository', serviciosRepo);
  const serviciosUseCases = new ServiciosUseCases(serviciosRepo);
  container.register('ServiciosUseCases', serviciosUseCases);
  const serviciosController = new ServiciosIpcController(serviciosUseCases);
  container.register('ServiciosIpcController', serviciosController);

  // Productos Registry
  const productosRepo = new SqliteProductosRepository(db);
  container.register('IProductosRepository', productosRepo);
  const generadorCodigo = new GeneradorCodigoBarras(productosRepo);
  container.register('GeneradorCodigoBarras', generadorCodigo);
  const productosUseCases = new ProductosUseCases(productosRepo, generadorCodigo);
  container.register('ProductosUseCases', productosUseCases);
  const productosController = new ProductosIpcController(productosUseCases);
  container.register('ProductosIpcController', productosController);

  // Ventas Registry
  const ventasRepo = new SqliteVentasRepository(db);
  container.register('IVentasRepository', ventasRepo);
  const ventasUseCases = new VentasUseCases(ventasRepo, uow, productosRepo, insumosRepo);
  container.register('VentasUseCases', ventasUseCases);
  const ventasController = new VentasIpcController(ventasUseCases);
  container.register('VentasIpcController', ventasController);

  // Cuentas Registry
  const cuentasRepo = new SqliteCuentasRepository(db);
  container.register('ICuentasRepository', cuentasRepo);
  const cuentasUseCases = new CuentasUseCases(cuentasRepo);
  container.register('CuentasUseCases', cuentasUseCases);
  const cuentasController = new CuentasIpcController(cuentasUseCases);
  container.register('CuentasIpcController', cuentasController);

  // Mermas Registry
  const mermasRepo = new SqliteMermasRepository(db);
  container.register('IMermasRepository', mermasRepo);
  const mermasUseCases = new MermasUseCases(mermasRepo, uow, productosRepo, insumosRepo);
  container.register('MermasUseCases', mermasUseCases);
  const mermasController = new MermasIpcController(mermasUseCases);
  container.register('MermasIpcController', mermasController);

  // Reportes Registry
  const reportesRepo = new SqliteReportesRepository(db);
  container.register('IReportesRepository', reportesRepo);
  const reportesUseCases = new ReportesUseCases(reportesRepo);
  container.register('ReportesUseCases', reportesUseCases);
  const reportesController = new ReportesIpcController(reportesUseCases);
  container.register('ReportesIpcController', reportesController);
}
