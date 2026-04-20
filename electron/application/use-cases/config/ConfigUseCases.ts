import { IConfigRepository } from '../../../domain/repositories/interfaces/IConfigRepository';
import { Result } from '../../../domain/common/Result';
import { ActualizarConfigDto, ActualizarConfigSchema } from '../../dtos/config.dto';

export class ObtenerConfigUseCase {
  constructor(private configRepository: IConfigRepository) {}

  async execute(): Promise<Result<Record<string, string>>> {
    return this.configRepository.getAll();
  }
}

export class ActualizarConfigUseCase {
  constructor(private configRepository: IConfigRepository) {}

  async execute(dto: ActualizarConfigDto): Promise<Result<void>> {
    const parseResult = ActualizarConfigSchema.safeParse(dto);
    if (!parseResult.success) {
      return {
        isSuccess: false,
        getValue: () => undefined,
        getError: () => new Error('Validación fallida: ' + parseResult.error.message)
      };
    }

    return this.configRepository.setMultiple(parseResult.data);
  }
}
