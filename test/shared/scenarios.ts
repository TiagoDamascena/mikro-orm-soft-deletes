import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { type Collection, type EntityClass, MikroORM, type Options, wrap } from '@mikro-orm/postgresql';
import { SOFT_DELETE_FILTER_NAME, SoftDeletesManager } from 'mikro-orm-soft-deletes';
import { databaseOptions } from './database.js';

export interface Author {
  id: number;
  name: string;
  books: Collection<Book>;
  deletedAt?: Date;
}

export interface Book {
  id: number;
  title: string;
  author: Author;
  deletedAt?: Date;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Comment {
  id: number;
  body: string;
  removedAt?: Date;
}

/** The entities each decorator flavour declares, with the same shape. */
export interface Entities {
  Author: EntityClass<Author> & (new (name: string) => Author);
  Book: EntityClass<Book> & (new (title: string, author: Author) => Book);
  /** Has no soft delete property: it is deleted for real. */
  Tag: EntityClass<Tag> & (new (name: string) => Tag);
  /** Inherits the soft delete property, named `removedAt`, from a base class that is not an entity. */
  Comment: EntityClass<Comment> & (new (body: string) => Comment);
}

export interface Suite {
  dbName: string;
  entities: Entities;
  orm?: Partial<Options>;
  /** Declares an entity with two `@DeletedAt()` properties, which has to throw. */
  declareTwoDeletedAt: () => unknown;
}

export function softDeleteScenarios({ dbName, entities, orm: ormOptions, declareTwoDeletedAt }: Suite): void {
  const { Author, Book, Tag, Comment } = entities;
  let orm: MikroORM;

  before(async () => {
    orm = await MikroORM.init({
      ...databaseOptions(dbName),
      entities: [Author, Book, Tag, Comment],
      extensions: [SoftDeletesManager],
      allowGlobalContext: true,
      ...ormOptions,
    });
    await orm.schema.ensureDatabase();
    await orm.schema.refresh();
  });

  after(async () => {
    await orm?.close(true);
  });

  beforeEach(async () => {
    await orm.schema.clear();
    orm.em.clear();
  });

  /** The row as it is in the database, with no filter in the way. */
  async function row(table: string, id: number): Promise<Record<string, unknown> | undefined> {
    const [found] = await orm.em.getConnection().execute(`select * from "${table}" where id = ?`, [id]);
    return found;
  }

  /**
   * The deletion date stored in the row: `undefined` when there is no row, `null` when it was not deleted. A raw
   * query returns the timestamp as text.
   */
  async function storedDeletion(table: string, id: number, column = 'deleted_at'): Promise<Date | null | undefined> {
    const found = await row(table, id);
    if (!found) {
      return undefined;
    }
    const value = found[column];
    return value == null ? null : new Date(value as string);
  }

  function assertDeleted(value: Date | null | undefined, message?: string): void {
    assert.ok(value instanceof Date && !Number.isNaN(value.getTime()), message ?? `expected a deletion date, got ${value}`);
  }

  async function createAuthor(name = 'Clarice', titles: string[] = []): Promise<Author> {
    const em = orm.em.fork();
    const author = new Author(name);
    for (const title of titles) {
      author.books.add(new Book(title, author));
    }
    await em.persist(author).flush();
    return author;
  }

  describe('removing an entity with @DeletedAt()', () => {
    test('updates the deletion date instead of deleting the row', async () => {
      const { id } = await createAuthor();
      const em = orm.em.fork();
      const author = await em.findOneOrFail(Author, id);

      const before = Date.now();
      await em.remove(author).flush();

      assert.ok(author.deletedAt instanceof Date);
      assert.ok(author.deletedAt.getTime() >= before - 1000);

      assertDeleted(await storedDeletion('author', id));
    });

    test('keeps the entity managed, with the date, in the same entity manager', async () => {
      const { id } = await createAuthor();
      const em = orm.em.fork();
      const author = await em.findOneOrFail(Author, id);

      await em.remove(author).flush();

      assert.equal(em.getUnitOfWork().getById(Author, id), author);
    });

    test('also writes the other changes made before the removal', async () => {
      const { id } = await createAuthor('Clarice');
      const em = orm.em.fork();
      const author = await em.findOneOrFail(Author, id);

      author.name = 'Clarice Lispector';
      await em.remove(author).flush();

      const stored = await row('author', id);
      assert.equal(stored?.name, 'Clarice Lispector');
      assertDeleted(await storedDeletion('author', id));
    });

    test('soft deletes through a cascaded removal', async () => {
      const author = await createAuthor('Clarice', ['A hora da estrela', 'Perto do coração selvagem']);
      const bookIds = author.books.getItems().map(book => book.id);
      const em = orm.em.fork();

      await em.remove(await em.findOneOrFail(Author, author.id, { populate: ['books'] })).flush();

      for (const id of bookIds) {
        assertDeleted(await storedDeletion('book', id), `book ${id} is soft deleted`);
      }
    });

    test('soft deletes an orphan removed from its collection', async () => {
      const author = await createAuthor('Clarice', ['Orphan']);
      const em = orm.em.fork();
      const found = await em.findOneOrFail(Author, author.id, { populate: ['books'] });
      const orphan = found.books.getItems()[0]!;

      found.books.remove(orphan);
      await em.flush();

      assertDeleted(await storedDeletion('book', orphan.id));
      assert.equal(await storedDeletion('author', author.id), null);
    });

    test('soft deletes an entity that inherits the property from a base class', async () => {
      const em = orm.em.fork();
      const comment = new Comment('Primeiro!');
      await em.persist(comment).flush();

      await em.remove(comment).flush();

      assert.ok(comment.removedAt instanceof Date);
      assertDeleted(await storedDeletion('comment', comment.id, 'removed_at'));
      assert.equal(await orm.em.fork().count(Comment), 0);
    });

    test('soft deletes inside a transaction, and a rollback undoes it', async () => {
      const kept = await createAuthor('Kept');
      const committed = await createAuthor('Committed');

      await orm.em.fork().transactional(async em => {
        em.remove(await em.findOneOrFail(Author, committed.id));
      });

      await assert.rejects(
        orm.em.fork().transactional(async em => {
          em.remove(await em.findOneOrFail(Author, kept.id));
          await em.flush();
          throw new Error('rollback');
        }),
        /rollback/,
      );

      assertDeleted(await storedDeletion('author', committed.id));
      assert.equal(await storedDeletion('author', kept.id), null);
    });

    test('works on a fork with a fresh event manager', async () => {
      const { id } = await createAuthor();
      const em = orm.em.fork({ freshEventManager: true });

      await em.remove(await em.findOneOrFail(Author, id)).flush();

      assertDeleted(await storedDeletion('author', id));
    });
  });

  describe('querying', () => {
    test('hides soft deleted rows from find, findOne and count by default', async () => {
      const kept = await createAuthor('Kept');
      const removed = await createAuthor('Removed');
      await orm.em.fork().remove(await orm.em.fork().findOneOrFail(Author, removed.id)).flush();

      const em = orm.em.fork();
      assert.deepEqual((await em.find(Author, {})).map(author => author.id), [kept.id]);
      assert.equal(await em.findOne(Author, removed.id), null);
      assert.equal(await em.count(Author), 1);
    });

    test('shows them with the filter disabled', async () => {
      const removed = await createAuthor('Removed');
      const em = orm.em.fork();
      await em.remove(await em.findOneOrFail(Author, removed.id)).flush();

      const found = await orm.em.fork().findOne(Author, removed.id, { filters: { [SOFT_DELETE_FILTER_NAME]: false } });
      assert.ok(found?.deletedAt instanceof Date);
      assert.equal(await orm.em.fork().count(Author, {}, { filters: { softDelete: false } }), 1);
    });

    test('leaves soft deleted entities out of a populated collection', async () => {
      const author = await createAuthor('Clarice', ['Kept', 'Removed']);
      const removed = author.books.getItems().find(book => book.title === 'Removed')!;
      const em = orm.em.fork();
      await em.remove(await em.findOneOrFail(Book, removed.id)).flush();

      const found = await orm.em.fork().findOneOrFail(Author, author.id, { populate: ['books'] });
      assert.deepEqual(found.books.getItems().map((book: Book) => book.title), ['Kept']);
    });

    test('keeps the deletion date out of the serialized entity', async () => {
      const { id } = await createAuthor();
      const em = orm.em.fork();
      const author = await em.findOneOrFail(Author, id);
      await em.remove(author).flush();

      assert.ok(!('deletedAt' in wrap(author).toObject()));
    });
  });

  describe('hard deletes', () => {
    test('an entity without @DeletedAt() is deleted for real', async () => {
      const em = orm.em.fork();
      const tag = new Tag('nr-1');
      await em.persist(tag).flush();

      await em.remove(tag).flush();

      assert.equal(await row('tag', tag.id), undefined);
    });

    test('a query builder delete deletes the row for real', async () => {
      const { id } = await createAuthor();

      await orm.em.fork().createQueryBuilder(Author).delete({ id }).execute();

      assert.equal(await row('author', id), undefined);
    });

    test('nativeDelete deletes the row for real', async () => {
      const { id } = await createAuthor();

      await orm.em.fork().nativeDelete(Author, { id });

      assert.equal(await row('author', id), undefined);
    });
  });

  describe('metadata', () => {
    test('the soft delete property is a nullable, hidden date', () => {
      const prop = orm.getMetadata().get(Author).properties.deletedAt;
      assert.equal(prop.nullable, true);
      assert.equal(prop.hidden, true);
      assert.equal(prop.runtimeType, 'Date');
    });

    test('an entity can only have one @DeletedAt()', () => {
      assert.throws(declareTwoDeletedAt, /already has a @DeletedAt\(\) property/);
    });
  });
}
