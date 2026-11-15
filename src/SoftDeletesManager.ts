import type { MikroORM } from '@mikro-orm/core';
import { addSoftDeleteFilters } from './metadata.js';
import { SoftDeletesSubscriber } from './SoftDeletesSubscriber.js';

/**
 * The extension that turns soft deletes on: `extensions: [SoftDeletesManager]`.
 *
 * MikroORM registers extensions before it discovers the entities and before it creates the entity manager. So the
 * extension adds the `softDelete` filters in the `afterDiscovered` hook (keeping the one already configured) and puts
 * the subscriber in the configuration, where every entity manager, forks and fresh event managers included, gets it.
 */
export class SoftDeletesManager {
  static register(orm: MikroORM): void {
    const subscribers = orm.config.get('subscribers') as unknown[];
    if (!subscribers.some(subscriber => subscriber instanceof SoftDeletesSubscriber)) {
      subscribers.push(new SoftDeletesSubscriber());
    }

    const discovery = orm.config.get('discovery');
    const afterDiscovered = discovery.afterDiscovered;

    // synchronous on purpose: `MikroORM.initSync` and the constructor call the hook without awaiting it
    discovery.afterDiscovered = (storage, platform) => {
      addSoftDeleteFilters(storage);
      return afterDiscovered?.(storage, platform);
    };
  }
}
