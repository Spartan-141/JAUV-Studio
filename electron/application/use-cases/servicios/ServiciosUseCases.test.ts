import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ServiciosUseCases } from './ServiciosUseCases';
import { IServiciosRepository } from '../../../domain/repositories/interfaces/IServiciosRepository';
import { ResultFactory } from '../../../domain/common/Result';

describe('ServiciosUseCases', () => {
  let mockRepo: jest.Mocked<IServiciosRepository>;
  let useCases: ServiciosUseCases;

  beforeEach(() => {
    mockRepo = {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    } as any;

    useCases = new ServiciosUseCases(mockRepo);
  });

  it('should list servicios', async () => {
    const mockData = [{ id: 1, nombre: 'Impresion', precio: 5, insumo_id: null, activo: 1 }];
    mockRepo.getAll.mockResolvedValue(ResultFactory.ok(mockData));

    const result = await useCases.listServicios();
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(mockData);
  });

  it('should create servicio', async () => {
    mockRepo.create.mockResolvedValue(ResultFactory.ok({ id: 1 }));

    const result = await useCases.createServicio({ nombre: 'Impresion', precio: 5 });
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Impresion', precio: 5, activo: 1 }));
  });

  it('should validate before creating servicio', async () => {
    const result = await useCases.createServicio({ nombre: '' }); // invalid
    expect(result.isSuccess).toBe(false);
  });

  it('should update servicio', async () => {
    mockRepo.update.mockResolvedValue(ResultFactory.ok(undefined));

    const result = await useCases.updateServicio({ id: 1, nombre: 'Copia', precio: 2 });
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: 'Copia', precio: 2 }));
  });

  it('should delete servicio', async () => {
    mockRepo.delete.mockResolvedValue(ResultFactory.ok(undefined));

    const result = await useCases.deleteServicio(1);
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should search servicios', async () => {
    mockRepo.search.mockResolvedValue(ResultFactory.ok([]));

    const result = await useCases.searchServicios('test');
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.search).toHaveBeenCalledWith('test');
  });

  it('should return empty if search query is empty', async () => {
    const result = await useCases.searchServicios('');
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
    expect(mockRepo.search).not.toHaveBeenCalled();
  });
});
