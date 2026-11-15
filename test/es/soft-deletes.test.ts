import { Cascade, Collection } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { DeletedAt } from 'mikro-orm-soft-deletes/es';
import { softDeleteScenarios } from '../shared/scenarios.js';

// The TC39 decorators, with no `reflect-metadata`: every type is explicit, except the one `@DeletedAt()` sets.

@Entity()
class Author {
  @PrimaryKey({ type: 'integer' })
  id!: number;

  @Property({ type: 'string' })
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
  @PrimaryKey({ type: 'integer' })
  id!: number;

  @Property({ type: 'string' })
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
  @PrimaryKey({ type: 'integer' })
  id!: number;

  @Property({ type: 'string' })
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

abstract class SoftDeletable {
  @PrimaryKey({ type: 'integer' })
  id!: number;

  @DeletedAt()
  removedAt?: Date;
}

@Entity()
class Comment extends SoftDeletable {
  @Property({ type: 'string' })
  body: string;

  constructor(body: string) {
    super();
    this.body = body;
  }
}

softDeleteScenarios({
  dbName: 'mikro_orm_soft_deletes_es',
  entities: { Author, Book, Tag, Comment },
  declareTwoDeletedAt: () => {
    class Twice {
      @PrimaryKey({ type: 'integer' })
      id!: number;

      @DeletedAt()
      deletedAt?: Date;

      @DeletedAt()
      archivedAt?: Date;
    }
    return Twice;
  },
});
