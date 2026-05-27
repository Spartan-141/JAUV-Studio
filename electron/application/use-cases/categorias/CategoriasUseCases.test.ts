import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CategoriaUseCases } from './CategoriasUseCases';
import { ICategoriasRepository } from '../../../domain/repositories/interfaces/ICategoriasRepository';
import { ResultFactory } from '../../../domain/common/Result';

describe('CategoriaUseCases', () => {
  let mockCategoriasRepository: jest.Mocked<ICategoriasRepository>;
  let useCases: CategoriaUseCases;

  beforeEach(() => {
    mockCategoriasRepository = {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getAllProductos: jest.fn(),
      bulkAssignProductos: jest.fn(),
    } as any;

    useCases = new CategoriaUseCases(mockCategoriasRepository);
  });

  it('should list categories', async () => {
    const mockCategorias = [{ id: 1, nombre: 'Test', total_productos: 0 }];
    mockCategoriasRepository.getAll.mockResolvedValue(ResultFactory.ok(mockCategorias));

    const result = await useCases.listCategorias();
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(mockCategorias);
  });

  it('should create category if valid', async () => {
    mockCategoriasRepository.create.mockResolvedValue(ResultFactory.ok({ id: 1, nombre: 'Papeleria' }));

    const result = await useCases.createCategoria({ nombre: 'Papeleria' });
    expect(result.isSuccess).toBe(true);
    expect(mockCategoriasRepository.create).toHaveBeenCalledWith('Papeleria');
  });

  it('should fail to create category if invalid', async () => {
    const result = await useCases.createCategoria({ nombre: '' }); // empty string
    expect(result.isSuccess).toBe(false);
    expect(result.getError()?.message).toContain('El nombre de la categoría es requerido');
    expect(mockCategoriasRepository.create).not.toHaveBeenCalled();
  });

  it('should update category if valid', async () => {
    mockCategoriasRepository.update.mockResolvedValue(ResultFactory.ok(undefined));

    const result = await useCases.updateCategoria({ id: 1, nombre: 'Oficina' });
    expect(result.isSuccess).toBe(true);
    expect(mockCategoriasRepository.update).toHaveBeenCalledWith(1, 'Oficina');
  });

  it('should fail to update category if invalid', async () => {
    const result = await useCases.updateCategoria({ id: -1, nombre: 'Oficina' });
    expect(result.isSuccess).toBe(false);
    expect(mockCategoriasRepository.update).not.toHaveBeenCalled();
  });

  it('should delete category if valid id', async () => {
    mockCategoriasRepository.delete.mockResolvedValue(ResultFactory.ok(undefined));

    const result = await useCases.deleteCategoria(1);
    expect(result.isSuccess).toBe(true);
    expect(mockCategoriasRepository.delete).toHaveBeenCalledWith(1);
  });

  it('should bulk assign categories to products', async () => {
    mockCategoriasRepository.bulkAssignProductos.mockResolvedValue(ResultFactory.ok(undefined));

    const payload = { categoria_id: 1, producto_ids: [1, 2, 3] };
    const result = await useCases.bulkAssignProductos(payload);
    expect(result.isSuccess).toBe(true);
    expect(mockCategoriasRepository.bulkAssignProductos).toHaveBeenCalledWith(1, [1, 2, 3]);
  });
});
