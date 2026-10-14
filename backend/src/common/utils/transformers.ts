import { ValueTransformer } from 'typeorm';

/** Postgres returns bigint / numeric as strings; amounts here stay below 2^53 so Number is exact. */
export const numberTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
