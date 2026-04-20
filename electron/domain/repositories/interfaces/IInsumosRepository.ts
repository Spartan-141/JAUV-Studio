import { Result } from '../../common/Result';

export interface Insumo {
  id: number;
  nombre: string;
  tipo: string;
  stock_hojas: number;
  stock_minimo: number;
  costo_por_hoja: number;
}

export interface IInsumosRepository {
  getAll(): Promise<Result<Insumo[]>>;
  create(data: Omit<Insumo, 'id'>): Promise<Result<{ id: number }>>;
  update(id: number, data: Omit<Insumo, 'id'>): Promise<Result<void>>;
  delete(id: number): Promise<Result<void>>;
  ajustarStock(id: number, cantidad: number, operacion: 'sumar' | 'restar'): Promise<Result<{ stock_hojas: number }>>;
}
