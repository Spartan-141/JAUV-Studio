import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { InsumosUseCases } from './InsumosUseCases';
import { IInsumosRepository } from '../../../domain/repositories/interfaces/IInsumosRepository';
import { ResultFactory } from '../../../domain/common/Result';

describe('InsumosUseCases', () => {
  let mockRepo: jest.Mocked<IInsumosRepository>;
  let useCases: InsumosUseCases;

  beforeEach(() => {
    mockRepo = {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ajustarStock: jest.fn(),
      ajustarStockRaw: jest.fn(),
    } as any;

    useCases = new InsumosUseCases(mockRepo);
  });

  it('should list insumos', async () => {
    const mockInsumos = [{ id: 1, nombre: 'Tinta', tipo: 'tinta', stock_hojas: 100, stock_minimo: 10, costo_por_hoja: 0.5 }];
    mockRepo.getAll.mockResolvedValue(ResultFactory.ok(mockInsumos));

    const result = await useCases.listInsumos();
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(mockInsumos);
  });

  it('should create insumo if valid', async () => {
    mockRepo.create.mockResolvedValue(ResultFactory.ok({ id: 1 }));

    const payload = { nombre: 'Papel Carta', tipo: 'hoja', stock_hojas: 500, stock_minimo: 100, costo_por_hoja: 0.1 };
    const result = await useCases.createInsumo(payload);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.create).toHaveBeenCalledWith(payload);
  });

  it('should validate before creating insumo', async () => {
    const result = await useCases.createInsumo({ nombre: '' }); // invalid
    expect(result.isSuccess).toBe(false);
  });

  it('should update insumo if valid', async () => {
    mockRepo.update.mockResolvedValue(ResultFactory.ok(undefined));

    const payload = { id: 1, nombre: 'Papel Oficio', tipo: 'hoja', stock_hojas: 500, stock_minimo: 100, costo_por_hoja: 0.2 };
    const result = await useCases.updateInsumo(payload);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: 'Papel Oficio' }));
  });

  it('should adjust stock', async () => {
    mockRepo.ajustarStock.mockResolvedValue(ResultFactory.ok({ stock_hojas: 150 }));

    const result = await useCases.ajustarStock({ id: 1, cantidad: 50, operacion: 'sumar' });
    
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.ajustarStock).toHaveBeenCalledWith(1, 50, 'sumar');
  });

  it('should validate adjust stock payload', async () => {
    const result = await useCases.ajustarStock({ id: 1, cantidad: -10, operacion: 'sumar' }); // negative quantity
    expect(result.isSuccess).toBe(false);
  });
});
