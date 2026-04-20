import { IMermasRepository, Merma } from '../../../domain/repositories/interfaces/IMermasRepository';
import { Result, ResultFactory } from '../../../domain/common/Result';
import { Database } from '../connection/Database';

export class SqliteMermasRepository implements IMermasRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async list(limit: number = 200): Promise<Result<Merma[]>> {
    try {
      const dbConn = this.db.getConnection();
      const rows = await dbConn.all(`
        SELECT m.*, p.nombre AS producto_nombre, i.nombre AS insumo_nombre
        FROM mermas m
        LEFT JOIN productos p ON p.id = m.producto_id
        LEFT JOIN insumos i ON i.id = m.insumo_id
        ORDER BY m.fecha DESC LIMIT ?
      `, [limit]);
      return ResultFactory.ok(rows as Merma[]);
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }

  async create(merma: Omit<Merma, 'id' | 'fecha' | 'producto_nombre' | 'insumo_nombre'>): Promise<Result<{ id: number; }>> {
    try {
      const dbConn = this.db.getConnection();
      const info = await dbConn.run(`
        INSERT INTO mermas (producto_id, insumo_id, cantidad, motivo, notas)
        VALUES (?, ?, ?, ?, ?)
      `, [
        merma.producto_id || null,
        merma.insumo_id || null,
        merma.cantidad,
        merma.motivo,
        merma.notas || ''
      ]);
      
      if (!info.lastID) throw new Error('No lastID returned for merma insert');
      return ResultFactory.ok({ id: info.lastID });
    } catch (e) {
      return ResultFactory.fail(e instanceof Error ? e : String(e));
    }
  }
}
