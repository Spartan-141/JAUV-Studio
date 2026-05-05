import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { VentasUseCases } from './VentasUseCases';
import { IVentasRepository } from '../../../domain/repositories/interfaces/IVentasRepository';
import { IProductosRepository } from '../../../domain/repositories/interfaces/IProductosRepository';
import { IInsumosRepository } from '../../../domain/repositories/interfaces/IInsumosRepository';
import { IUnitOfWork } from '../../interfaces/IUnitOfWork';
import { ResultFactory } from '../../../domain/common/Result';

describe('VentasUseCases', () => {
  let useCases: VentasUseCases;
  let mockVentasRepo: jest.Mocked<IVentasRepository>;
  let mockProductosRepo: jest.Mocked<IProductosRepository>;
  let mockInsumosRepo: jest.Mocked<IInsumosRepository>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockVentasRepo = {
      create: jest.fn(),
      addDetalle: jest.fn(),
      addPago: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      ultimas: jest.fn(),
      paginate: jest.fn(),
      calendario: jest.fn(),
    } as any;

    mockProductosRepo = {
      getById: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      paginate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      codeExists: jest.fn(),
    } as any;

    mockInsumosRepo = {
      ajustarStock: jest.fn(),
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockUow = {
      start: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    useCases = new VentasUseCases(mockVentasRepo, mockUow, mockProductosRepo, mockInsumosRepo);
  });

  describe('crearVenta', () => {
    const validPayload = {
      cabecera: {
        subtotal: 100,
        total: 100,
        cliente_nombre: 'Test Client',
      },
      detalles: [
        {
          tipo: 'producto',
          ref_id: 1,
          nombre: 'Producto 1',
          cantidad: 2,
          precio_unitario: 50,
          subtotal: 100,
        },
      ],
      pagos: [
        {
          metodo: 'Efectivo',
          monto: 100,
        },
      ],
    };

    it('should create a sale successfully and deduct stock', async () => {
      // Setup mocks
      mockVentasRepo.create.mockResolvedValue(ResultFactory.ok(123));
      mockVentasRepo.addDetalle.mockResolvedValue(ResultFactory.ok(undefined));
      mockVentasRepo.addPago.mockResolvedValue(ResultFactory.ok(undefined));
      
      mockProductosRepo.getById.mockResolvedValue(ResultFactory.ok({
        id: 1,
        nombre: 'Producto 1',
        stock_actual: 10,
      } as any));
      mockProductosRepo.update.mockResolvedValue(ResultFactory.ok(undefined));

      const result = await useCases.crearVenta(validPayload);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({ id: 123 });
      
      // Verify UOW
      expect(mockUow.start).toHaveBeenCalled();
      expect(mockUow.commit).toHaveBeenCalled();
      expect(mockUow.rollback).not.toHaveBeenCalled();

      // Verify stock deduction
      expect(mockProductosRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        stock_actual: 8 // 10 - 2
      }));
    });

    it('should rollback and return error if payload is invalid', async () => {
      const invalidPayload = { cabecera: {}, detalles: [] }; // No detalles

      const result = await useCases.crearVenta(invalidPayload);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()?.message).toContain('al menos un');
      expect(mockUow.start).not.toHaveBeenCalled();
    });

    it('should rollback if header insertion fails', async () => {
      mockVentasRepo.create.mockResolvedValue(ResultFactory.fail('DB Error'));

      const result = await useCases.crearVenta(validPayload);

      expect(result.isSuccess).toBe(false);
      expect(mockUow.rollback).toHaveBeenCalled();
      expect(mockUow.commit).not.toHaveBeenCalled();
    });

    it('should rollback if stock deduction fails or item insertion fails', async () => {
      mockVentasRepo.create.mockResolvedValue(ResultFactory.ok(123));
      mockVentasRepo.addDetalle.mockResolvedValue(ResultFactory.fail('Detalle Error'));

      const result = await useCases.crearVenta(validPayload);

      expect(result.isSuccess).toBe(false);
      expect(mockUow.rollback).toHaveBeenCalled();
      expect(mockUow.commit).not.toHaveBeenCalled();
    });

    it('should deduct sheets (hojas) correctly for services', async () => {
      const servicePayload = {
        ...validPayload,
        detalles: [
          {
            tipo: 'servicio',
            ref_id: 5,
            nombre: 'Fotocopia',
            cantidad: 10,
            cantidad_hojas_gastadas: 15, // Manual override
            precio_unitario: 1,
            subtotal: 10,
            insumo_id: 2,
          }
        ]
      };

      mockVentasRepo.create.mockResolvedValue(ResultFactory.ok(124));
      mockVentasRepo.addDetalle.mockResolvedValue(ResultFactory.ok(undefined));
      mockVentasRepo.addPago.mockResolvedValue(ResultFactory.ok(undefined));
      mockInsumosRepo.ajustarStock.mockResolvedValue(ResultFactory.ok({ stock_hojas: 100 }));

      const result = await useCases.crearVenta(servicePayload);

      expect(result.isSuccess).toBe(true);
      expect(mockInsumosRepo.ajustarStock).toHaveBeenCalledWith(2, 15, 'restar');
    });
  });
});
