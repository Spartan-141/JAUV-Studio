import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ReportesUseCases } from './ReportesUseCases';
import { IReportesRepository } from '../../../domain/repositories/interfaces/IReportesRepository';
import { ResultFactory } from '../../../domain/common/Result';

describe('ReportesUseCases', () => {
  let mockRepo: jest.Mocked<IReportesRepository>;
  let useCases: ReportesUseCases;

  beforeEach(() => {
    mockRepo = {
      getHoy: jest.fn(),
      getInventario: jest.fn(),
      getDashboardMetrics: jest.fn(),
    } as any;

    useCases = new ReportesUseCases(mockRepo);
  });

  it('should get reporte hoy', async () => {
    mockRepo.getHoy.mockResolvedValue(ResultFactory.ok({ total_ventas: 10 } as any));

    const result = await useCases.getReporteHoy('2024-01-01');
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.getHoy).toHaveBeenCalledWith('2024-01-01');
  });

  it('should get inventario stats', async () => {
    mockRepo.getInventario.mockResolvedValue(ResultFactory.ok({ stats: {}, bajo_stock: [] } as any));

    const result = await useCases.getInventarioStats();
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.getInventario).toHaveBeenCalled();
  });

  it('should get dashboard metrics', async () => {
    mockRepo.getDashboardMetrics.mockResolvedValue(ResultFactory.ok({ trend: [], top_productos: [], top_deudores: [] } as any));

    const result = await useCases.getDashboardMetrics();
    expect(result.isSuccess).toBe(true);
    expect(mockRepo.getDashboardMetrics).toHaveBeenCalled();
  });
});
