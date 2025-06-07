import { ChangeSetType, EventSubscriber, FlushEventArgs, wrap } from "@mikro-orm/core";
import { getSoftDeleteMetadata } from "./Metadata";

export class SoftDeletesSubscriber implements EventSubscriber {
  async onFlush(args: FlushEventArgs) {
    const { uow } = args;

    const changeSets = uow.getChangeSets();
    for (const changeSet of changeSets) {
      if (changeSet.type === ChangeSetType.DELETE) {
        const entity = changeSet.entity;
        const softDeleteMetadata = getSoftDeleteMetadata(entity);
        if (softDeleteMetadata?.enabled) {
          const field = softDeleteMetadata.field;

          changeSet.type = ChangeSetType.UPDATE;
          changeSet.payload[field] = new Date();
          changeSet.entity[field] = new Date();
        }
      }
    }
  }
}
