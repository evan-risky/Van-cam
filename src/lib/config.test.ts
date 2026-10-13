import { describe, expect, it } from "vitest";
import {
  isAllowedMimeType,
  isQuota,
  isValidGuestName,
} from "@/lib/config";

describe("isQuota", () => {
  it("menerima hanya 4, 8, 16, 32", () => {
    expect(isQuota(4)).toBe(true);
    expect(isQuota(8)).toBe(true);
    expect(isQuota(16)).toBe(true);
    expect(isQuota(32)).toBe(true);
  });

  it("menolak nilai lain", () => {
    expect(isQuota(0)).toBe(false);
    expect(isQuota(5)).toBe(false);
    expect(isQuota("8")).toBe(false);
    expect(isQuota(Number.NaN)).toBe(false);
  });
});

describe("isValidGuestName", () => {
  it("menerima 2–60 karakter", () => {
    expect(isValidGuestName("Ani")).toBe(true);
    expect(isValidGuestName("  Rani & Bagas  ")).toBe(true);
  });

  it("menolak terlalu pendek, terlalu panjang, dan bukan string", () => {
    expect(isValidGuestName("A")).toBe(false);
    expect(isValidGuestName("a".repeat(61))).toBe(false);
    expect(isValidGuestName(42)).toBe(false);
  });
});

describe("isAllowedMimeType", () => {
  it("menerima jpeg, png, webp", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("image/webp")).toBe(true);
  });

  it("menolak tipe lain", () => {
    expect(isAllowedMimeType("image/gif")).toBe(false);
    expect(isAllowedMimeType("application/pdf")).toBe(false);
  });
});