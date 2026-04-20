import { z } from 'zod';

export const ActualizarConfigSchema = z.record(z.string(), z.string());

export type ActualizarConfigDto = z.infer<typeof ActualizarConfigSchema>;
