import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MermasUseCases } from './MermasUseCases';
import { IMermasRepository } from '../../../domain/repositories/interfaces/IMermasRepository';
import { IProductosRepository } from '../../../domain/repositories/interfaces/IProductosRepository';
import { IInsumosRepository } from '../../../domain/repositories/interfaces/IInsumosRepository';
import { IUnitOfWork } from '../../interfaces/IUnitOfWork';
import { ResultFactory } from '../../../domain/common/Result';

describe('MermasUseCases', () => {
  let mockRepo: jest.Mocked<IMermasRepository>;
  let mockUow: jest.Mocked<IUnitOfWork>;
  let mockProductosRepo: jest.Mocked<IProductosRepository>;
  let mockInsumosRepo: jest.Mocked<IInsumosRepository>;
  let useCases: MermasUseCases;

  beforeEach(() => {
    mockRepo = {
      list: jest.fn(),
      create: jest.fn(),
    } as any;

    mockUow = {
      start: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    } as any;

    mockProductosRepo = {
      getById: jest.fn(),
      update: jest.fn(),
    } as any;

    mockInsumosRepo = {
      ajustarStock: jest.fn(),
    } as any;

    useCases = new MermasUseCases(mockRepo, mockUow, mockProductosRepo, mockInsumosRepo);
  });

  it('should list mermas', async () => {
    mockRepo.list.mockResolvedValue(ResultFactory.ok([]));

    const result = await useCases.listMermas();
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.list).toHaveBeenCalled();
  });

  it('should return error if no product and no insumo is provided', async () => {
    const payload = { producto_id: null, insumo_id: null, cantidad: 1, motivo: 'test' };
    const result = await useCases.createMerma(payload);
    expect(result.isSuccess).toBe(false);
    expect(result.getError()?.message).toContain('Debe especificar');
  });

  it('should create merma and update product stock', async () => {
    mockUow.start.mockResolvedValue();
    mockUow.commit.mockResolvedValue();
    mockRepo.create.mockResolvedValue(ResultFactory.ok({ id: 1 }));
    mockProductosRepo.getById.mockResolvedValue(ResultFactory.ok({ stock_actual: 10 } as any));
    mockProductosRepo.update.mockResolvedValue(ResultFactory.ok(undefined));

    const payload = { producto_id: 1, cantidad: 2, motivo: 'Roto' };
    const result = await useCases.createMerma(payload);

    expect(result.isSuccess).toBe(true);
    expect(mockUow.start).toHaveBeenCalled();
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ producto_id: 1, cantidad: 2 }));
    expect(mockProductosRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ stock_actual: 8 }));
    expect(mockUow.commit).toHaveBeenCalled();
  });

  it('should create merma and update insumo stock', async () => {
    mockUow.start.mockResolvedValue();
    mockUow.commit.mockResolvedValue();
    mockRepo.create.mockResolvedValue(ResultFactory.ok({ id: 2 }));
    mockInsumosRepo.ajustarStock.mockResolvedValue(ResultFactory.ok({ stock_hojas: 8 }));

    const payload = { insumo_id: 1, cantidad: 5, motivo: 'Seca' };
    const result = await useCases.createMerma(payload);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ insumo_id: 1, cantidad: 5 }));
    expect(mockInsumosRepo.ajustarStock).toHaveBeenCalledWith(1, 5, 'restar');
    expect(mockUow.commit).toHaveBeenCalled();
  });

  it('should rollback transaction if create fails', async () => {
    mockUow.start.mockResolvedValue();
    mockRepo.create.mockResolvedValue(ResultFactory.fail(new Error('DB Error')));

    const result = await useCases.createMerma({ producto_id: 1, cantidad: 1, motivo: 'x' });
    expect(result.isSuccess).toBe(false);
    expect(mockUow.rollback).toHaveBeenCalled();
    expect(mockUow.commit).not.toHaveBeenCalled();
  });
});
