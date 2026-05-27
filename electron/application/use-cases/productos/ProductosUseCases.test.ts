import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ProductosUseCases } from './ProductosUseCases';
import { IProductosRepository } from '../../../domain/repositories/interfaces/IProductosRepository';
import { GeneradorCodigoBarras } from '../../../domain/services/GeneradorCodigoBarras';
import { ResultFactory } from '../../../domain/common/Result';

describe('ProductosUseCases', () => {
  let mockRepo: jest.Mocked<IProductosRepository>;
  let mockGeneradorCodigo: jest.Mocked<GeneradorCodigoBarras>;
  let useCases: ProductosUseCases;

  beforeEach(() => {
    mockRepo = {
      list: jest.fn(),
      paginate: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      codeExists: jest.fn(),
    } as any;

    mockGeneradorCodigo = {
      generateUniqueCode: jest.fn()
    } as any;

    useCases = new ProductosUseCases(mockRepo, mockGeneradorCodigo);
  });

  it('should list products', async () => {
    const mockProds = [{ id: 1, nombre: 'Test Prod' }];
    mockRepo.list.mockResolvedValue(ResultFactory.ok(mockProds as any));

    const result = await useCases.listProductos({});
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(mockProds);
  });

  it('should create product with auto-generated code if code is missing', async () => {
    mockGeneradorCodigo.generateUniqueCode.mockResolvedValue('AUTO-123');
    mockRepo.create.mockResolvedValue(ResultFactory.ok({ id: 1, codigo: 'AUTO-123' }));

    const result = await useCases.createProducto({ nombre: 'Cuaderno' });
    
    expect(result.isSuccess).toBe(true);
    expect(mockGeneradorCodigo.generateUniqueCode).toHaveBeenCalled();
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Cuaderno',
      codigo: 'AUTO-123'
    }));
  });

  it('should return error if manually entered code already exists', async () => {
    mockRepo.codeExists.mockResolvedValue(ResultFactory.ok(true)); // code exists

    const result = await useCases.createProducto({ nombre: 'Cuaderno', codigo: 'EXISTING-CODE' });
    
    expect(result.isSuccess).toBe(false);
    expect(result.getError()?.message).toContain('ya está en uso');
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should update a product with valid schema', async () => {
    mockRepo.update.mockResolvedValue(ResultFactory.ok(undefined));

    const result = await useCases.updateProducto({ id: 1, nombre: 'Nuevo Nombre', precio_venta: 10 });
    
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: 'Nuevo Nombre', precio_venta: 10 }));
  });

  it('should paginate products', async () => {
    const mockPageData = { productos: [], total: 0, page: 1, perPage: 25, pages: 0 };
    mockRepo.paginate.mockResolvedValue(ResultFactory.ok(mockPageData));

    const result = await useCases.getPaginatedProductos({ page: 1, perPage: 25 });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(mockPageData);
  });
});
