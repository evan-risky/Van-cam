import { describe, expect, it } from "vitest";
import { hashToken, randomToken, signValue, verifyPassword, verifySignedValue, hashPassword } from "@/lib/crypto";

describe("token hashing", () => {
  it("menghasilkan hash stabil dan bukan token asli", () => {
    const token = "abc123";
    const hash = hashToken(token);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
  });

  it("menghasilkan token acak yang berbeda", () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("password hashing", () => {
  it("menerima kata sandi yang benar", () => {
    const stored = hashPassword("rahasia-ku");
    expect(verifyPassword("rahasia-ku", stored)).toBe(true);
  });

  it("menolak kata sandi yang salah", () => {
    const stored = hashPassword("rahasia-ku");
    expect(verifyPassword("salah", stored)).toBe(false);
  });

  it("menolak hash berformat buruk", () => {
    expect(verifyPassword("x", "bukan-hash")).toBe(false);
  });
});

describe("signed value", () => {
  it("memverifikasi tanda tangan yang sah", () => {
    const { token, signature } = signValue("payload");
    expect(verifySignedValue(token, signature)).toBe(true);
  });

  it("menolak tanda tangan yang diubah", () => {
    const { token } = signValue("payload");
    expect(verifySignedValue(token, "signature-palsu")).toBe(false);
  });
});