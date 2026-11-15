import type { EntityMetadata, EntityProperty, FilterDef, MetadataStorage, PropertyOptions } from '@mikro-orm/core';
import { SOFT_DELETE_FILTER_NAME, SOFT_DELETE_PROPERTY_FLAG } from './constants.js';

/** Options of `@DeletedAt()`: the same as `@Property()`. */
export type DeletedAtOptions<Owner extends object = object> = PropertyOptions<Owner>;

/**
 * The property options `@DeletedAt()` passes to `@Property()`. The type is explicit because MikroORM 7 no longer
 * reflects it by default, and the flag is what marks the property as the soft delete one.
 */
export function deletedAtPropertyOptions<Owner extends object>(options: DeletedAtOptions<Owner>): DeletedAtOptions<Owner> {
  return {
    type: Date,
    nullable: true,
    hidden: true,
    ...options,
    [SOFT_DELETE_PROPERTY_FLAG]: true,
  } as DeletedAtOptions<Owner>;
}

/** Throws when the entity already has a soft delete property: there can only be one. */
export function assertSingleDeletedAt(meta: Partial<EntityMetadata>, propertyName: string): void {
  const existing = Object.values(meta.properties ?? {}).find(
    prop => isSoftDeleteProperty(prop) && prop.name !== propertyName,
  );

  if (existing) {
    const entity = meta.className ?? 'The entity';
    throw new Error(`${entity} already has a @DeletedAt() property (${existing.name}): an entity can only have one.`);
  }
}

/** Whether the property is the soft delete property of its entity. */
export function isSoftDeleteProperty(prop: Partial<EntityProperty> | undefined): boolean {
  return !!prop && (prop as Record<string, unknown>)[SOFT_DELETE_PROPERTY_FLAG] === true;
}

/**
 * Adds the `softDelete` filter, on by default, to every discovered entity with a soft delete property. It is done
 * here, after discovery, and not by the decorator, so an entity that inherits the property from a base class gets
 * the filter too. A `softDelete` filter the entity declares itself is kept.
 */
export function addSoftDeleteFilters(storage: MetadataStorage): void {
  for (const meta of storage.getAll().values()) {
    const prop = Object.values(meta.properties).find(prop => isSoftDeleteProperty(prop));

    if (prop) {
      meta.filters[SOFT_DELETE_FILTER_NAME] ??= softDeleteFilter(prop.name);
    }
  }
}

function softDeleteFilter(propertyName: string): FilterDef {
  return {
    name: SOFT_DELETE_FILTER_NAME,
    cond: { [propertyName]: null },
    default: true,
  };
}

const softDeleteProperties = new WeakMap<EntityMetadata, string | null>();

/** The name of the soft delete property of the entity, or `null` when it has none. */
export function findSoftDeleteProperty(meta: EntityMetadata): string | null {
  let name = softDeleteProperties.get(meta);

  if (name === undefined) {
    name = meta.props.find(prop => isSoftDeleteProperty(prop))?.name ?? null;
    softDeleteProperties.set(meta, name);
  }

  return name;
}
