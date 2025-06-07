import { SOFT_DELETE_METADATA } from "./Constants";

export interface SoftDeleteMetadata {
  enabled: boolean;
  field: string;
}

export function getSoftDeleteMetadata(entity: object): SoftDeleteMetadata | undefined {
  return Reflect.getMetadata(SOFT_DELETE_METADATA, entity.constructor) as SoftDeleteMetadata | undefined;
}