#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/df0e0b19a85aae5aa7cb3b6fee3dccddb7ced6aaa3fe6d7cad496a0a275d8bfb/contract';
import endContract from '../../snapshots/df0e0b19a85aae5aa7cb3b6fee3dccddb7ced6aaa3fe6d7cad496a0a275d8bfb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ed6723f50e679ec00814a8113823a61e7ed7669255dd86e42a6aff93ed98a09d/contract';
import startContract from '../../snapshots/ed6723f50e679ec00814a8113823a61e7ed7669255dd86e42a6aff93ed98a09d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addUnique({
        schema: 'public',
        table: 'Verification',
        constraint: 'Verification_identifier_value_key',
        columns: ['identifier', 'value'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
