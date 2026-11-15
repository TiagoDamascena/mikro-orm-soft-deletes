# Mikro ORM Soft Deletes

An extension for Mikro ORM that adds support for soft deletes: removing an entity sets a deletion date instead of
deleting the row, and queries leave the soft deleted rows out.

| mikro-orm-soft-deletes | Mikro ORM | Node.js     |
| ---------------------- | --------- | ----------- |
| 1.x                    | 7.x       | >= 22.17    |
| 0.x                    | 6.x       | same as v6  |

## How to use it

Install the package. `@mikro-orm/core` and `@mikro-orm/decorators` are peer dependencies, which a Mikro ORM 7
project with decorators already has.

```
npm i mikro-orm-soft-deletes
```

Register it as an extension on your Mikro ORM config:

```ts
import { MikroORM } from '@mikro-orm/postgresql';
import { SoftDeletesManager } from 'mikro-orm-soft-deletes';

const orm = await MikroORM.init({
  extensions: [SoftDeletesManager],
});
```

Then make an entity soft deletable with `@DeletedAt()` on the property that records when the row was deleted. Like
Mikro ORM 7, the decorator comes in two flavours, and you import the one that matches the rest of your decorators:

- `mikro-orm-soft-deletes/legacy`: legacy TypeScript decorators (`experimentalDecorators`), used with
  `@mikro-orm/decorators/legacy`;
- `mikro-orm-soft-deletes/es`: TC39 decorators, used with `@mikro-orm/decorators/es`.

`@DeletedAt()` is a `@Property()` that is nullable, hidden and of type `Date` by default, and it takes the same
options.

```ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { DeletedAt } from 'mikro-orm-soft-deletes/legacy';

@Entity()
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @DeletedAt()
  deletedAt?: Date;
}
```

An entity can only have one `@DeletedAt()` property. It can come from a base class: every entity that extends it
is soft deletable.

### Removing

Removing a soft deletable entity turns into an update that sets the property to a new `Date`:

```ts
const user = await em.findOneOrFail(User, 1);
await em.remove(user).flush();

user.deletedAt; // the deletion date
```

The entity stays managed by the entity manager, now with the date. Other changes made to it before the removal are
written in the same update, and cascaded removals (`Cascade.REMOVE`, orphan removal) soft delete the related
entities that are soft deletable too.

### Querying

Every soft deletable entity gets a `softDelete` filter, on by default, so `find`, `findOne`, `count` and populated
relations leave the soft deleted rows out. To get them too, disable the filter:

```ts
const users = await em.find(User, {}, {
  filters: { softDelete: false },
});
```

The filter name is also exported as `SOFT_DELETE_FILTER_NAME`. If the entity declares its own `softDelete` filter,
that one is kept.

## Hard deletes

Only `em.remove()` is turned into a soft delete. Queries that delete rows directly still delete them for real, which
is the way to bypass the soft delete:

```ts
await em.nativeDelete(User, { id: 1 });

await em.createQueryBuilder(User).delete({ id: 1 }).execute();
```

## Upgrading from 0.x (Mikro ORM 6)

- Import `DeletedAt` from `mikro-orm-soft-deletes/legacy` (or `/es`), next to the Mikro ORM decorators.
- The package is ESM only, like Mikro ORM 7. A CommonJS project loads it through `require(esm)`, the same way it
  loads Mikro ORM itself.
- `reflect-metadata` is no longer needed by the package: `@DeletedAt()` declares its type.
- `SoftDeletesManager` now registers the subscriber in the configuration, so forks with a fresh event manager also
  soft delete. The subscriber is exported as `SoftDeletesSubscriber` too.

## Development

The tests run against PostgreSQL, once with the legacy decorators and once with the TC39 ones. They read the
connection from `DB_HOST`, `DB_PORT`, `DB_USER` and `DB_PASSWORD` (by default `localhost:5432`, `postgres`,
`postgres`) and create their own databases.

```
npm test
```

### Publishing

Publishing a GitHub release stages the package on npm, through the `Publish` workflow. The release tag has to match
the `version` in `package.json` (`1.0.0` or `v1.0.0`), and the workflow runs the typecheck and the tests before
staging. A release marked as a pre-release is staged with the `next` dist-tag instead of `latest`.

A staged version is not installable until a maintainer approves it with 2FA, on npmjs.com or with
`npm stage approve <stage-id>` (`npm stage list` shows the queue). The workflow cannot approve it.

The workflow authenticates with npm trusted publishing (OIDC), so there is no npm token in the repository. The
package on npm trusts this repository's `publish.yml` for `npm stage publish` only, not for `npm publish`, and npm
adds the provenance of each version.

## About

This package was heavily inspired and influenced by this existing [package](https://github.com/Char2sGu/mikro-orm-soft-delete).
