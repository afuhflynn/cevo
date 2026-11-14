#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/37a2b500fb48911c11d9548057d5d4f24531fabc82f285cf7a726054e4bf44a9/contract';
import startContract from '../../snapshots/37a2b500fb48911c11d9548057d5d4f24531fabc82f285cf7a726054e4bf44a9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e75ee564aaf2ab13ed6c8e09e217cbcffcafb50ca6c69c0ea8e536ffa8904cb6/contract';
import endContract from '../../snapshots/e75ee564aaf2ab13ed6c8e09e217cbcffcafb50ca6c69c0ea8e536ffa8904cb6/contract.json' with { type: 'json' };
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
        table: 'TemplateDraft',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('createdBy', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('sourceFileId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('templateId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TemplateDraft',
        index: 'TemplateDraft_status_createdAt_idx_58610442',
        columns: ['status', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TemplateDraft',
        index: 'TemplateDraft_templateId_idx_19e0d972',
        columns: ['templateId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TemplateDraft',
        foreignKey: {
          name: 'TemplateDraft_templateId_fkey',
          columns: ['templateId'],
          references: { schema: 'public', table: 'ProjectTemplate', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
