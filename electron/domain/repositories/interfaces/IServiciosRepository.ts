import { Result } from '../../common/Result';

export interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  insumo_id: number | null;
  activo: boolean | number;
  insumo_nombre?: string;
}

export interface IServiciosRepository {
  getAll(): Promise<Result<Servicio[]>>;
  create(data: Omit<Servicio, 'id' | 'insumo_nombre'>): Promise<Result<{ id: number }>>;
  update(id: number, data: Omit<Servicio, 'id' | 'insumo_nombre'>): Promise<Result<void>>;
  delete(id: number): Promise<Result<void>>;
  search(query: string): Promise<Result<Servicio[]>>;
}
