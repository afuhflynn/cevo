#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4fcc8d5f33dc5c35a5f68c30bf95c0789a03395898d8ef0112be183644b062d7/contract';
import startContract from '../../snapshots/4fcc8d5f33dc5c35a5f68c30bf95c0789a03395898d8ef0112be183644b062d7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9bca2ddca539a5eb3ad8b8bf2c3a9c8dfaeae999b326f1ce6e6f170f3691936a/contract';
import endContract from '../../snapshots/9bca2ddca539a5eb3ad8b8bf2c3a9c8dfaeae999b326f1ce6e6f170f3691936a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
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
        table: 'BriefVersion',
        columns: [
          col('briefId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modelId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('tokenCost', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WizardSession',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('currentBriefVersion', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('currentStep', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('projectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('readiness', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('suggestedTemplateId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WizardSession_status_check_1e195f92',
            sql`"status" IN ('DRAFT', 'CHATTING', 'SYNTHESIZING', 'AWAITING_APPROVAL', 'APPROVED', 'ABANDONED', 'EXPIRED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'WizardTurn',
        columns: [
          col('answerText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('fieldKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('followupText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isSufficient', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('promptText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WizardTurn_fieldKey_check_308e774c',
            sql`"fieldKey" IN ('BACKGROUND', 'PROBLEM', 'AIM', 'OBJECTIVES', 'QUESTIONS', 'SCOPE', 'LIMITATIONS', 'METHODOLOGY', 'OUTCOMES')`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'ProjectBrief',
        column: col('modelId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ProjectBrief',
        column: col('synthesisCost', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ProjectBrief',
        column: col('version', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'BriefVersion',
        constraint: 'BriefVersion_briefId_version_key',
        columns: ['briefId', 'version'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'WizardSession',
        constraint: 'WizardSession_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BriefVersion',
        index: 'BriefVersion_briefId_idx_c24a8d6e',
        columns: ['briefId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WizardSession',
        index: 'WizardSession_projectId_idx_a96e4d92',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WizardSession',
        index: 'WizardSession_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WizardSession',
        index: 'WizardSession_userId_status_idx_e4a128ba',
        columns: ['userId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WizardSession',
        index: 'WizardSession_userId_updatedAt_idx_42f5280d',
        columns: ['userId', 'updatedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WizardTurn',
        index: 'WizardTurn_sessionId_fieldKey_createdAt_idx_1c358858',
        columns: ['sessionId', 'fieldKey', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WizardTurn',
        index: 'WizardTurn_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BriefVersion',
        foreignKey: {
          name: 'BriefVersion_briefId_fkey',
          columns: ['briefId'],
          references: { schema: 'public', table: 'ProjectBrief', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WizardSession',
        foreignKey: {
          name: 'WizardSession_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WizardSession',
        foreignKey: {
          name: 'WizardSession_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WizardTurn',
        foreignKey: {
          name: 'WizardTurn_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'WizardSession', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
