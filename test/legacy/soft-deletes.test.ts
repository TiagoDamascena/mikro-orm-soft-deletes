import { Cascade, Collection } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToMany, PrimaryKey, Property, ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { DeletedAt } from 'mikro-orm-soft-deletes/legacy';
import { softDeleteScenarios } from '../shared/scenarios.js';

// The legacy decorators with `reflect-metadata`, as a project coming from MikroORM 6 uses them: the property
// types come from TypeScript's emitted metadata.

@Entity()
class Author {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, book => book.author, {
    cascade: [Cascade.PERSIST, Cascade.REMOVE],
    orphanRemoval: true,
  })
  books = new Collection<Book>(this);

  @DeletedAt()
  deletedAt?: Date;

  constructor(name: string) {
    this.name = name;
  }
}

@Entity()
class Book {
  @PrimaryKey()
  id!: number;

  @Property()
  title: string;

  @ManyToOne(() => Author)
  author: Author;

  @DeletedAt()
  deletedAt?: Date;

  constructor(title: string, author: Author) {
    this.title = title;
    this.author = author;
  }
}

@Entity()
class Tag {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

abstract class SoftDeletable {
  @PrimaryKey()
  id!: number;

  @DeletedAt()
  removedAt?: Date;
}

@Entity()
class Comment extends SoftDeletable {
  @Property()
  body: string;

  constructor(body: string) {
    super();
    this.body = body;
  }
}

softDeleteScenarios({
  dbName: 'mikro_orm_soft_deletes_legacy',
  entities: { Author, Book, Tag, Comment },
  orm: { metadataProvider: ReflectMetadataProvider },
  declareTwoDeletedAt: () => {
    class Twice {
      @PrimaryKey()
      id!: number;

      @DeletedAt()
      deletedAt?: Date;

      @DeletedAt()
      archivedAt?: Date;
    }
    return Twice;
  },
});
