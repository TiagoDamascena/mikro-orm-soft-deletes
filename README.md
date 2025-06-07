# Mikro ORM Soft Deletes
An extension for Mikro ORM that adds support for soft deletes

## How to use it
First install the package using npm

```
npm i -s mikro-orm-soft-deletes
```

Then you should register it as an extension on your Mikro ORM config:

```ts
import { SoftDeletesManager } from 'mikro-orm-soft-deletes';

const orm = await MikroORM.init({
  extensions: [ SoftDeletesManager ],
});

```

Now you can make any entity soft deletable by adding a @SoftDelete() decorator on the property you want to be used to mark a row as deleted on the database. This decorator is a wrapper around the Mikro ORM Property, so it supports the exact same options to configure it.

```ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { DeletedAt } from 'mikro-orm-soft-deletes';

@Entity()
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @Property()
  email: string;

  @Property({ hidden: true })
  password: string;

  @DeletedAt()
  deletedAt: Date | null;
}
```

When you do a remove on an Entity with soft deletes the SoftDeleteManager will automatically convert it to an update setting the deletedAt property to a new Date();

```ts
const user = await em.findOne(User, 1);
em.remove(user);
await em.flush();
```

When querying this entity a filter to remove soft deleted rows is automatically applied, so you dont need to worry about it. But in some cases you want to get deleted entities too, to do it you can disable the soft delete filter:
```ts
const users = await em.findAll(User, {}, {
  filters: {
    softDelete: false,
  },
});
```

## Hard deletes
If you, by any reason, need to bypass the soft delete and actually delete a row from the database you can use the nativeDelete:
```ts
await em.nativeDelete(User, {
  id: 1,
});
```

## About
This package was heavly inspired and influenced by this existing [package](https://github.com/Char2sGu/mikro-orm-soft-delete).
