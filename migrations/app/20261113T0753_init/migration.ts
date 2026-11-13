#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/31dd1dcf645b135093b4f320e520c8ddd81886ec3b230dc33b8185bf7cb04815/contract';
import endContract from '../../snapshots/31dd1dcf645b135093b4f320e520c8ddd81886ec3b230dc33b8185bf7cb04815/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/54f2a420096168acbacd6afe85ae4d60e800edccafe1d8e7681c87db42471bcb/contract';
import startContract from '../../snapshots/54f2a420096168acbacd6afe85ae4d60e800edccafe1d8e7681c87db42471bcb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'WizardSession',
        column: col('approvalKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'WizardSession',
        constraint: 'WizardSession_approvalKey_key',
        columns: ['approvalKey'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
