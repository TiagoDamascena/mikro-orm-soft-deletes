/** Name of the filter that hides soft deleted rows. Disable it with `filters: { softDelete: false }`. */
export const SOFT_DELETE_FILTER_NAME = 'softDelete';

/**
 * Key set on the metadata of the soft delete property. The subscriber finds the property by it, and it
 * lives on the property, not on the class, so subclasses inherit it with the rest of the metadata.
 */
export const SOFT_DELETE_PROPERTY_FLAG = 'softDeletes';
