#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/df0e0b19a85aae5aa7cb3b6fee3dccddb7ced6aaa3fe6d7cad496a0a275d8bfb/contract';
import startContract from '../../snapshots/df0e0b19a85aae5aa7cb3b6fee3dccddb7ced6aaa3fe6d7cad496a0a275d8bfb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ff9d5471816dec3a39c981e1dbdf57b170867c73f252b7d9bd7eb3a60c7a9054/contract';
import endContract from '../../snapshots/ff9d5471816dec3a39c981e1dbdf57b170867c73f252b7d9bd7eb3a60c7a9054/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'Account',
        column: 'updatedAt',
        type: 'timestamptz(3)',
        temporaryDefault: sql`'epoch'`,
      }),
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'Session',
        column: 'updatedAt',
        type: 'timestamptz(3)',
        temporaryDefault: sql`'epoch'`,
      }),
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'Verification',
        column: 'updatedAt',
        type: 'timestamptz(3)',
        temporaryDefault: sql`'epoch'`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
