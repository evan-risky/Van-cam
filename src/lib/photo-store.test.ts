import { describe, expect, it } from "vitest";
import { isPhotoStoreSupported, newIdempotencyKey } from "@/lib/photo-store";

describe("newIdempotencyKey", () => {
  it("unik, berawalan p_, dan sesuai batas server (8-128)", () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a.startsWith("p_")).toBe(true);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(128);
  });
});

describe("isPhotoStoreSupported", () => {
  it("mengembalikan boolean tanpa melempar", () => {
    expect(typeof isPhotoStoreSupported()).toBe("boolean");
  });
});