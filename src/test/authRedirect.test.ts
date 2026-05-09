import { beforeEach, describe, expect, it } from "vitest";
import { clearAuthRestorePath, getAuthRestorePath, isProtectedRestorePath, saveAuthRestorePath } from "@/lib/authRedirect";

describe("authRedirect", () => {
  beforeEach(() => {
    const store = new Map<string, string>();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
    });
  });

  it("accepts protected platform routes", () => {
    expect(isProtectedRestorePath("/trade")).toBe(true);
    expect(isProtectedRestorePath("/trade?tab=signals")).toBe(true);
    expect(isProtectedRestorePath("/admin/finance")).toBe(true);
    expect(isProtectedRestorePath("/deposit")).toBe(true);
  });

  it("rejects public auth and marketing routes", () => {
    expect(isProtectedRestorePath("/")).toBe(false);
    expect(isProtectedRestorePath("/login")).toBe(false);
    expect(isProtectedRestorePath("/register")).toBe(false);
    expect(isProtectedRestorePath("/about")).toBe(false);
  });

  it("stores and restores the last protected route", () => {
    saveAuthRestorePath("/withdraw?method=mpesa");

    expect(getAuthRestorePath()).toBe("/withdraw?method=mpesa");
  });

  it("falls back to trade when the stored route is invalid or cleared", () => {
    saveAuthRestorePath("/about");
    expect(getAuthRestorePath()).toBe("/trade");

    saveAuthRestorePath("/admin/dashboard");
    clearAuthRestorePath();
    expect(getAuthRestorePath()).toBe("/trade");
  });
});
