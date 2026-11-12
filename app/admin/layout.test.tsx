import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAdmin: fns.requireAdmin,
}));

import AdminLayout from "./layout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminLayout", () => {
  it("AC-5: renders admin content only after the guard allows it", async () => {
    fns.requireAdmin.mockResolvedValue({ id: "u1", role: "ADMIN" });
    const ui = await AdminLayout({ children: <p>Admin area</p> });
    render(ui);

    expect(fns.requireAdmin).toHaveBeenCalledWith("/admin", "GET");
    expect(screen.getByText("Admin area")).toBeInTheDocument();
  });

  it("AC-5: never renders admin content when the guard denies it", async () => {
    fns.requireAdmin.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(AdminLayout({ children: <p>Admin area</p> })).rejects.toThrow(
      "FORBIDDEN",
    );
  });
});
