import { Result } from '../../common/Result';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  marca: string;
  precio_compra_usd: number;
  precio_venta_usd: number;
  precio_compra_ves: number;
  precio_venta_ves: number;
  moneda_precio: string;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: number | null;
  descripcion: string;
  created_at?: string;
  categoria_nombre?: string;
}

export interface ProductoFilters {
  search?: string;
  categoria_id?: number;
  bajo_stock?: boolean;
}

export interface IProductosRepository {
  list(filters: ProductoFilters): Promise<Result<Producto[]>>;
  getById(id: number): Promise<Result<Producto>>;
  create(data: Omit<Producto, 'id' | 'created_at' | 'categoria_nombre'>): Promise<Result<{ id: number; codigo: string }>>;
  update(id: number, data: Omit<Producto, 'id' | 'created_at' | 'categoria_nombre'>): Promise<Result<void>>;
  delete(id: number): Promise<Result<void>>;
  search(query: string): Promise<Result<Producto[]>>;
  codeExists(code: string): Promise<Result<boolean>>;
}
