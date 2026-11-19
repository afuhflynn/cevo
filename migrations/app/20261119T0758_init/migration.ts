#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/79efc624fb1fdccf6df4091c60c4b884940cca0d3e84e8d14bf2101efc209acf/contract';
import startContract from '../../snapshots/79efc624fb1fdccf6df4091c60c4b884940cca0d3e84e8d14bf2101efc209acf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c5359ae2ff69452c45c3195885bec3b07f023bf85a9f6f0807338d79200b9e1f/contract';
import endContract from '../../snapshots/c5359ae2ff69452c45c3195885bec3b07f023bf85a9f6f0807338d79200b9e1f/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'NotificationPreference',
        columns: [
          col('billingAlerts', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productUpdates', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('researchDigests', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'NotificationPreference',
        constraint: 'NotificationPreference_userId_key',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NotificationPreference',
        foreignKey: {
          name: 'NotificationPreference_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
