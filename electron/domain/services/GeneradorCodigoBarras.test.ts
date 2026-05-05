import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GeneradorCodigoBarras } from './GeneradorCodigoBarras';
import { IProductosRepository } from '../repositories/interfaces/IProductosRepository';
import { ResultFactory } from '../common/Result';

describe('GeneradorCodigoBarras', () => {
  let generator: GeneradorCodigoBarras;
  let mockRepo: jest.Mocked<IProductosRepository>;

  beforeEach(() => {
    mockRepo = {
      codeExists: jest.fn(),
    } as any;
    generator = new GeneradorCodigoBarras(mockRepo);
  });

  describe('generateCode', () => {
    it('should generate a code with PAP- prefix and 6 hex chars', () => {
      const code = generator.generateCode();
      expect(code).toMatch(/^PAP-[0-9A-F]{6}$/);
    });
  });

  describe('generateUniqueCode', () => {
    it('should retry until a unique code is found', async () => {
      // First one exists, second one doesn't
      mockRepo.codeExists
        .mockResolvedValueOnce(ResultFactory.ok(true))
        .mockResolvedValueOnce(ResultFactory.ok(false));

      const code = await generator.generateUniqueCode();
      
      expect(code).toMatch(/^PAP-[0-9A-F]{6}$/);
      expect(mockRepo.codeExists).toHaveBeenCalledTimes(2);
    });

    it('should throw if the repository returns an error', async () => {
      mockRepo.codeExists.mockResolvedValue(ResultFactory.fail('DB Error'));

      await expect(generator.generateUniqueCode()).rejects.toThrow('DB Error');
    });
  });
});
