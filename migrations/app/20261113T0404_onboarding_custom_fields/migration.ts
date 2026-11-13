#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4fcc8d5f33dc5c35a5f68c30bf95c0789a03395898d8ef0112be183644b062d7/contract';
import endContract from '../../snapshots/4fcc8d5f33dc5c35a5f68c30bf95c0789a03395898d8ef0112be183644b062d7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ff9d5471816dec3a39c981e1dbdf57b170867c73f252b7d9bd7eb3a60c7a9054/contract';
import startContract from '../../snapshots/ff9d5471816dec3a39c981e1dbdf57b170867c73f252b7d9bd7eb3a60c7a9054/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'AcademicProfile',
        column: col('customDepartment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'AcademicProfile',
        column: col('customFaculty', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
