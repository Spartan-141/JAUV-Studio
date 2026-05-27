import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ObtenerConfigUseCase, ActualizarConfigUseCase } from './ConfigUseCases';
import { IConfigRepository } from '../../../domain/repositories/interfaces/IConfigRepository';
import { ResultFactory, Result } from '../../../domain/common/Result';

describe('ConfigUseCases', () => {
  let mockConfigRepository: jest.Mocked<IConfigRepository>;
  let obtenerConfigUseCase: ObtenerConfigUseCase;
  let actualizarConfigUseCase: ActualizarConfigUseCase;

  beforeEach(() => {
    mockConfigRepository = {
      get: jest.fn(),
      getAll: jest.fn(),
      set: jest.fn(),
      setMultiple: jest.fn(),
    } as any;

    obtenerConfigUseCase = new ObtenerConfigUseCase(mockConfigRepository);
    actualizarConfigUseCase = new ActualizarConfigUseCase(mockConfigRepository);
  });

  describe('ObtenerConfigUseCase', () => {
    it('debería retornar todas las configuraciones', async () => {
      const mockConfigs = { tasa_bcv: '36.5' };
      mockConfigRepository.getAll.mockResolvedValue(ResultFactory.ok(mockConfigs));

      const result = await obtenerConfigUseCase.execute();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(mockConfigs);
      expect(mockConfigRepository.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('ActualizarConfigUseCase', () => {
    it('debería actualizar las configuraciones si el DTO es válido', async () => {
      mockConfigRepository.setMultiple.mockResolvedValue(ResultFactory.ok(undefined));

      const dto = { tasa_bcv: '40.0', moneda_principal: 'VES' };
      const result = await actualizarConfigUseCase.execute(dto);

      expect(result.isSuccess).toBe(true);
      expect(mockConfigRepository.setMultiple).toHaveBeenCalledWith(dto);
    });

    it('debería fallar si los tipos del DTO no son válidos (no son strings)', async () => {
      // El esquema espera Record<string, string>. Pasaremos un número para simular error.
      const dto = { tasa_bcv: 40.0 } as any; 
      
      const result = await actualizarConfigUseCase.execute(dto);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()?.message).toContain('Validación fallida');
      expect(mockConfigRepository.setMultiple).not.toHaveBeenCalled();
    });
  });
});
