import { type EntityMetadata, MetadataStorage } from '@mikro-orm/core';
import { Property } from '@mikro-orm/decorators/legacy';
import { assertSingleDeletedAt, deletedAtPropertyOptions, type DeletedAtOptions } from './metadata.js';

export { SOFT_DELETE_FILTER_NAME, SoftDeletesManager, SoftDeletesSubscriber } from './index.js';
export type { DeletedAtOptions } from './metadata.js';

/**
 * Marks the property that records when the row was soft deleted, as a legacy TypeScript decorator (the one used
 * with `experimentalDecorators` and `@mikro-orm/decorators/legacy`). It is a `@Property()`, nullable and hidden by
 * default and with the same options; the `SoftDeletesManager` extension adds the `softDelete` filter to the entity.
 */
export function DeletedAt<Owner extends object>(options: DeletedAtOptions<Owner> = {}) {
  return function (target: Owner, propertyName: string): void {
    const entity = target.constructor as { [MetadataStorage.META_SYMBOL]?: EntityMetadata };

    // checked before `@Property()`, which would otherwise register the second property first
    if (Object.hasOwn(entity, MetadataStorage.META_SYMBOL)) {
      assertSingleDeletedAt(entity[MetadataStorage.META_SYMBOL]!, propertyName);
    }

    Property(deletedAtPropertyOptions(options))(target, propertyName);
  };
}
