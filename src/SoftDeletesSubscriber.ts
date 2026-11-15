import { ChangeSetType, type EventSubscriber, type FlushEventArgs } from '@mikro-orm/core';
import { findSoftDeleteProperty } from './metadata.js';

/**
 * Turns the removal of an entity with a `@DeletedAt()` property into an update that sets it.
 *
 * It runs on `onFlush`, after the change sets are computed and before anything is written: each delete change set
 * of a soft deletable entity is recomputed as an update (an early delete becomes an early update, so the order of
 * the queries is kept). The entity stays managed, now with the deletion date.
 */
export class SoftDeletesSubscriber implements EventSubscriber {
  onFlush({ uow }: FlushEventArgs): void {
    for (const changeSet of uow.getChangeSets()) {
      if (changeSet.type !== ChangeSetType.DELETE && changeSet.type !== ChangeSetType.DELETE_EARLY) {
        continue;
      }

      const property = findSoftDeleteProperty(changeSet.meta);
      if (!property) {
        continue;
      }

      const entity = changeSet.entity as Record<string, unknown>;
      entity[property] = new Date();

      const type = changeSet.type === ChangeSetType.DELETE_EARLY ? ChangeSetType.UPDATE_EARLY : ChangeSetType.UPDATE;
      uow.computeChangeSet(changeSet.entity, type);
    }
  }
}
