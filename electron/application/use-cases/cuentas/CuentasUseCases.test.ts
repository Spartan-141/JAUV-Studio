import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CuentasUseCases } from './CuentasUseCases';
import { ICuentasRepository } from '../../../domain/repositories/interfaces/ICuentasRepository';
import { ResultFactory } from '../../../domain/common/Result';

describe('CuentasUseCases', () => {
  let mockRepo: jest.Mocked<ICuentasRepository>;
  let useCases: CuentasUseCases;

  beforeEach(() => {
    mockRepo = {
      listCreditos: jest.fn(),
      getCredito: jest.fn(),
      abonar: jest.fn(),
      ajustarDeuda: jest.fn(),
      sincronizarPrecioArticulo: jest.fn(),
    } as any;

    useCases = new CuentasUseCases(mockRepo);
  });

  it('should get cuentas', async () => {
    mockRepo.listCreditos.mockResolvedValue(ResultFactory.ok([]));

    const result = await useCases.getCuentas();
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.listCreditos).toHaveBeenCalled();
  });

  it('should get cuenta detalle', async () => {
    mockRepo.getCredito.mockResolvedValue(ResultFactory.ok(null));

    const result = await useCases.getCuentaDetalle(1);
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.getCredito).toHaveBeenCalledWith(1);
  });

  it('should return error for invalid id when getting detalle', async () => {
    const result = await useCases.getCuentaDetalle(0);
    expect(result.isSuccess).toBe(false);
  });

  it('should registrar abono', async () => {
    mockRepo.abonar.mockResolvedValue(ResultFactory.ok({ saldo_pendiente: 0, estado: 'pagada' }));

    const payload = { venta_id: 1, metodo: 'efectivo', monto: 10 };
    const result = await useCases.registrarAbono(payload);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.abonar).toHaveBeenCalledWith(1, payload);
  });

  it('should validate before registrar abono', async () => {
    const result = await useCases.registrarAbono({ venta_id: 1, metodo: '', monto: -10 });
    expect(result.isSuccess).toBe(false);
  });

  it('should ajustar deuda', async () => {
    mockRepo.ajustarDeuda.mockResolvedValue(ResultFactory.ok({ saldo_pendiente: 5, estado: 'credito' }));

    const result = await useCases.ajustarDeuda({ venta_id: 1, nuevo_saldo: 5 });
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.ajustarDeuda).toHaveBeenCalledWith(1, 5);
  });

  it('should sincronizar precio articulo', async () => {
    mockRepo.sincronizarPrecioArticulo.mockResolvedValue(ResultFactory.ok({ saldo_pendiente: 15, total: 15, estado: 'credito' }));

    const result = await useCases.sincronizarPrecioArticulo({ venta_id: 1, detalle_id: 2, nuevo_precio: 10 });
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.sincronizarPrecioArticulo).toHaveBeenCalledWith(1, 2, 10);
  });
});
