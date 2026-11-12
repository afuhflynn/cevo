import { describe, expect, it } from "vitest";
import { contract, db } from "./prisma";

describe("prisma client singleton", () => {
  it("exposes a validated contract and a query client", () => {
    expect(contract).toBeDefined();
    expect(db).toBeDefined();
    expect(typeof db.transaction).toBe("function");
  });

  it("exposes the auth models the auth adapter binds to", () => {
    expect(db.orm.public.User).toBeDefined();
    expect(db.orm.public.Session).toBeDefined();
    expect(db.orm.public.Account).toBeDefined();
    expect(db.orm.public.Verification).toBeDefined();
  });
});
