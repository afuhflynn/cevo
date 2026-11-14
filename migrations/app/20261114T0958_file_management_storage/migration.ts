#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/31dd1dcf645b135093b4f320e520c8ddd81886ec3b230dc33b8185bf7cb04815/contract';
import startContract from '../../snapshots/31dd1dcf645b135093b4f320e520c8ddd81886ec3b230dc33b8185bf7cb04815/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/37a2b500fb48911c11d9548057d5d4f24531fabc82f285cf7a726054e4bf44a9/contract';
import endContract from '../../snapshots/37a2b500fb48911c11d9548057d5d4f24531fabc82f285cf7a726054e4bf44a9/contract.json' with { type: 'json' };
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
        table: 'AiAssistRun',
        columns: [
          col('actualCredits', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('estimateCredits', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inputChars', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inputHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inputText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modelId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('operation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('promptVersion', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('scope', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sectionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sectionVersion', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('held'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokenCost', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AiSuggestion',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originalText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paragraphIndex', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revisedText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('runId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('warnings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Citation',
        column: col('anchorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Citation',
        column: col('formattedText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Citation',
        column: col('style', 'text', {
          notNull: true,
          default: lit('APA_7'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'FileAsset',
        column: col('checksumSha256', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'FileAsset',
        column: col('extractionError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'FileAsset',
        column: col('extractionStatus', 'text', {
          notNull: true,
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ResearchSource',
        column: col('formattedApa', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ResearchSource',
        column: col('formattedHarvard', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ResearchSource',
        column: col('lastVerifiedAt', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addRequiredColumnToEmptyTable({
        schema: 'public',
        table: 'FileAsset',
        column: 'clientToken',
        type: 'text',
      }),
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'FileAsset',
        column: 'updatedAt',
        type: 'timestamptz(3)',
        temporaryDefault: sql`'epoch'`,
      }),
      this.addRequiredColumnToEmptyTable({
        schema: 'public',
        table: 'FileAsset',
        column: 'uploadedByUserId',
        type: 'text',
      }),
      this.addUnique({
        schema: 'public',
        table: 'AiAssistRun',
        constraint: 'AiAssistRun_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AiSuggestion',
        constraint: 'AiSuggestion_runId_paragraphIndex_key',
        columns: ['runId', 'paragraphIndex'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Citation',
        constraint: 'Citation_sectionId_sourceId_key',
        columns: ['sectionId', 'sourceId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'FileAsset',
        constraint: 'FileAsset_clientToken_key',
        columns: ['clientToken'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AiAssistRun',
        index: 'AiAssistRun_projectId_createdAt_idx_d2d6484f',
        columns: ['projectId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AiAssistRun',
        index: 'AiAssistRun_sectionId_createdAt_idx_9fabc30e',
        columns: ['sectionId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AiSuggestion',
        index: 'AiSuggestion_runId_idx_a6016437',
        columns: ['runId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Citation',
        index: 'Citation_citationKey_idx_0e47c5aa',
        columns: ['citationKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FileAsset',
        index: 'FileAsset_projectId_createdAt_id_idx_efb29810',
        columns: ['projectId', 'createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FileAsset',
        index: 'FileAsset_uploadedByUserId_idx_b9c62f4a',
        columns: ['uploadedByUserId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AiSuggestion',
        foreignKey: {
          name: 'AiSuggestion_runId_fkey',
          columns: ['runId'],
          references: { schema: 'public', table: 'AiAssistRun', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FileAsset',
        foreignKey: {
          name: 'FileAsset_uploadedByUserId_fkey',
          columns: ['uploadedByUserId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
