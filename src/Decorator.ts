import { MetadataStorage, Property, PropertyOptions } from '@mikro-orm/core';
import { SOFT_DELETE_FILTER_NAME, SOFT_DELETE_METADATA } from './Constants';
import { SoftDeleteMetadata } from './Metadata';

export const DeletedAt = (
  options: PropertyOptions<object> = {},
): PropertyDecorator => {
  return (target: object, propertyKey: string|symbol) => {
    if (typeof propertyKey !== 'string') {
      propertyKey = propertyKey.toString();
    }

    const existingMetadata = Reflect.getMetadata(SOFT_DELETE_METADATA, target.constructor);
    if (existingMetadata) {
      throw new Error('An entity can only have one DeletedAt property');
    }

    const metadata: SoftDeleteMetadata = {
      enabled: true,
      field: propertyKey,
    };

    Reflect.defineMetadata(SOFT_DELETE_METADATA, metadata, target.constructor);

    const meta = MetadataStorage.getMetadataFromDecorator(target.constructor);
    meta.filters[SOFT_DELETE_FILTER_NAME] = {
      name: SOFT_DELETE_FILTER_NAME,
      cond: {
        [propertyKey]: null,
      },
      default: true,
    };

    const property = Property({
      nullable: true,
      hidden: true,
      ...options,
    });

    property(target, propertyKey);
  };
};
