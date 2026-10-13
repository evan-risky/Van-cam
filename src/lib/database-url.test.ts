import { describe, expect, it } from "vitest";
import { buildMariaDbPoolConfig } from "@/lib/database-url";

describe("buildMariaDbPoolConfig", () => {
  it("mengaktifkan SSL tanpa verifikasi CA untuk Aiven (ssl-mode=REQUIRED)", () => {
    const config = buildMariaDbPoolConfig(
      "mysql://avnadmin:secret@host:12345/defaultdb?ssl-mode=REQUIRED",
    );
    expect(config.host).toBe("host");
    expect(config.port).toBe(12345);
    expect(config.user).toBe("avnadmin");
    expect(config.database).toBe("defaultdb");
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("memverifikasi CA untuk ssl-mode=VERIFY_IDENTITY", () => {
    const config = buildMariaDbPoolConfig(
      "mysql://u:p@host:3306/db?ssl-mode=VERIFY_IDENTITY",
    );
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("tidak memaksa SSL bila ssl-mode=DISABLED", () => {
    const config = buildMariaDbPoolConfig(
      "mysql://u:p@host:3306/db?ssl-mode=DISABLED",
    );
    expect(config.ssl).toBeUndefined();
  });

  it("tanpa parameter SSL tetap tanpa ssl (development lokal)", () => {
    const config = buildMariaDbPoolConfig("mysql://u:p@localhost:3306/db");
    expect(config.ssl).toBeUndefined();
    expect(config.port).toBe(3306);
  });

  it("mendukung kredensial ter-encode", () => {
    const config = buildMariaDbPoolConfig(
      "mysql://user%40mail:p%21w@host:3306/db",
    );
    expect(config.user).toBe("user@mail");
    expect(config.password).toBe("p!w");
  });
});