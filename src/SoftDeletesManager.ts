import { MikroORM } from "@mikro-orm/core";
import { SoftDeletesSubscriber } from "./SoftDeletesSubscriber";

export class SoftDeletesManager {
  static register(orm: MikroORM) {
    orm.em.getEventManager().registerSubscriber(new SoftDeletesSubscriber());
  }
}
