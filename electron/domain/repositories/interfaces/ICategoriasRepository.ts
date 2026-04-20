import { Result } from '../../common/Result';

export interface Categoria {
  id: number;
  nombre: string;
  total_productos?: number; // Fetched optionally
}

export interface ProductoSimple {
  id: number;
  nombre: string;
  marca: string;
  codigo: string;
  stock_actual: number;
  categoria_id: number | null;
  categoria_nombre?: string;
}

export interface ICategoriasRepository {
  getAll(): Promise<Result<Categoria[]>>;
  create(nombre: string): Promise<Result<{ id: number; nombre: string }>>;
  update(id: number, nombre: string): Promise<Result<void>>;
  delete(id: number): Promise<Result<void>>;
  getAllProductos(): Promise<Result<ProductoSimple[]>>;
  bulkAssignProductos(categoria_id: number, producto_ids: number[]): Promise<Result<void>>;
}
