import type { EntityMetadata } from '@mikro-orm/core';
import { Property } from '@mikro-orm/decorators/es';
import { assertSingleDeletedAt, deletedAtPropertyOptions, type DeletedAtOptions } from './metadata.js';

export { SOFT_DELETE_FILTER_NAME, SoftDeletesManager, SoftDeletesSubscriber } from './index.js';
export type { DeletedAtOptions } from './metadata.js';

/**
 * Marks the property that records when the row was soft deleted, as a TC39 decorator (the one used without
 * `experimentalDecorators` and with `@mikro-orm/decorators/es`). It is a `@Property()`, nullable and hidden by
 * default and with the same options; the `SoftDeletesManager` extension adds the `softDelete` filter to the entity.
 */
export function DeletedAt<Owner extends object>(options: DeletedAtOptions<Owner> = {}) {
  return function (value: undefined, context: ClassFieldDecoratorContext<Owner>): void {
    assertSingleDeletedAt(context.metadata as Partial<EntityMetadata<Owner>>, String(context.name));
    Property(deletedAtPropertyOptions(options))(value, context);
  };
}
