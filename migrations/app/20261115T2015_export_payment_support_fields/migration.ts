#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6f49f4cde23bd0456469d3960aa13daa72ee43a07f6ba630fb92fab2957cb50b/contract';
import startContract from '../../snapshots/6f49f4cde23bd0456469d3960aa13daa72ee43a07f6ba630fb92fab2957cb50b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/79efc624fb1fdccf6df4091c60c4b884940cca0d3e84e8d14bf2101efc209acf/contract';
import endContract from '../../snapshots/79efc624fb1fdccf6df4091c60c4b884940cca0d3e84e8d14bf2101efc209acf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ExportJob',
        column: col('attemptCount', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ExportJob',
        column: col('clientKey', 'text', {
          notNull: true,
          default: lit('legacy'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ExportJob',
        column: col('expiresAt', 'timestamptz(3)', {
          notNull: true,
          default: fn(sql`now()`),
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ExportJob',
        column: col('requestedBy', 'text', {
          notNull: true,
          default: lit('unknown'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ExportJob',
        column: col('templateVersionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('webhookVerifiedAt', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentWebhookEvent',
        column: col('providerTransId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentWebhookEvent',
        column: col('signatureValid', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'SupportTicket',
        column: col('assigneeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addRequiredColumnToEmptyTable({
        schema: 'public',
        table: 'Payment',
        column: 'clientKey',
        type: 'text',
      }),
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'Payment',
        column: 'expiresAt',
        type: 'timestamptz(3)',
        temporaryDefault: sql`'epoch'`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'ExportJob',
        constraint: 'ExportJob_projectId_format_clientKey_key',
        columns: ['projectId', 'format', 'clientKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_userId_clientKey_key',
        columns: ['userId', 'clientKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExportJob',
        index: 'ExportJob_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentWebhookEvent',
        index: 'PaymentWebhookEvent_providerTransId_idx_93e3c66d',
        columns: ['providerTransId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupportTicket',
        index: 'SupportTicket_assigneeId_idx_fd12ae38',
        columns: ['assigneeId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
