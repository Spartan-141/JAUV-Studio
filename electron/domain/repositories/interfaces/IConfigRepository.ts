import { Result } from '../../common/Result';

export interface IConfigRepository {
  get(key: string): Promise<Result<string>>;
  getAll(): Promise<Result<Record<string, string>>>;
  set(key: string, value: string): Promise<Result<void>>;
  setMultiple(configs: Record<string, string>): Promise<Result<void>>;
}
