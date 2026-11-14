#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6f49f4cde23bd0456469d3960aa13daa72ee43a07f6ba630fb92fab2957cb50b/contract';
import endContract from '../../snapshots/6f49f4cde23bd0456469d3960aa13daa72ee43a07f6ba630fb92fab2957cb50b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e75ee564aaf2ab13ed6c8e09e217cbcffcafb50ca6c69c0ea8e536ffa8904cb6/contract';
import startContract from '../../snapshots/e75ee564aaf2ab13ed6c8e09e217cbcffcafb50ca6c69c0ea8e536ffa8904cb6/contract.json' with { type: 'json' };
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
        table: 'ReviewRun',
        columns: [
          col('clientRunKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('createdBy', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('driftCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('formattingCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('missingCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('skipReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('skippedSemantic', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('running'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('templateVersionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('truncated', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('uncitedCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ReviewWarning',
        columns: [
          col('blockIndex', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('checkType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('excerpt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('runId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sectionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sectionVersion', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('severity', 'text', {
            notNull: true,
            default: lit('warn'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ReviewRun',
        constraint: 'ReviewRun_projectId_clientRunKey_key',
        columns: ['projectId', 'clientRunKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReviewRun',
        index: 'ReviewRun_projectId_createdAt_idx_d2d6484f',
        columns: ['projectId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReviewRun',
        index: 'ReviewRun_projectId_idx_a96e4d92',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReviewWarning',
        index: 'ReviewWarning_runId_checkType_idx_eb85c1e9',
        columns: ['runId', 'checkType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReviewWarning',
        index: 'ReviewWarning_runId_idx_a6016437',
        columns: ['runId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReviewWarning',
        index: 'ReviewWarning_sectionId_idx_5d1ea56b',
        columns: ['sectionId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ReviewRun',
        foreignKey: {
          name: 'ReviewRun_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ReviewWarning',
        foreignKey: {
          name: 'ReviewWarning_runId_fkey',
          columns: ['runId'],
          references: { schema: 'public', table: 'ReviewRun', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ReviewWarning',
        foreignKey: {
          name: 'ReviewWarning_sectionId_fkey',
          columns: ['sectionId'],
          references: { schema: 'public', table: 'ProjectSection', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
