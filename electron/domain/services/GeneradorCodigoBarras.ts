import crypto from 'crypto';
import { IProductosRepository } from '../repositories/interfaces/IProductosRepository';

export class GeneradorCodigoBarras {
  constructor(private repo: IProductosRepository) {}

  public generateCode(): string {
    return 'PAP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  public async generateUniqueCode(): Promise<string> {
    let code = '';
    let exists = true;
    do {
      code = this.generateCode();
      const result = await this.repo.codeExists(code);
      if (result.isSuccess) {
        exists = result.getValue();
      } else {
        // Fallback to avoid infinite loop on DB err
        throw result.getError();
      }
    } while (exists);
    return code;
  }
}
