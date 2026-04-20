import { Result } from '../../common/Result';

export interface Merma {
  id?: number;
  fecha?: string;
  producto_id?: number | null;
  insumo_id?: number | null;
  cantidad: number;
  motivo: string;
  notas: string;
  // Joins
  producto_nombre?: string;
  insumo_nombre?: string;
}

export interface IMermasRepository {
  list(limit?: number): Promise<Result<Merma[]>>;
  create(merma: Omit<Merma, 'id' | 'fecha' | 'producto_nombre' | 'insumo_nombre'>): Promise<Result<{ id: number }>>;
}
