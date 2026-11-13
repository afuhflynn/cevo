#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/54f2a420096168acbacd6afe85ae4d60e800edccafe1d8e7681c87db42471bcb/contract';
import endContract from '../../snapshots/54f2a420096168acbacd6afe85ae4d60e800edccafe1d8e7681c87db42471bcb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9bca2ddca539a5eb3ad8b8bf2c3a9c8dfaeae999b326f1ce6e6f170f3691936a/contract';
import startContract from '../../snapshots/9bca2ddca539a5eb3ad8b8bf2c3a9c8dfaeae999b326f1ce6e6f170f3691936a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'WizardSession',
        column: col('departmentName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WizardSession',
        column: col('programmeName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WizardSession',
        column: col('qualification', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WizardSession',
        column: col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
