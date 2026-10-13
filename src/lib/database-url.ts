export type MariaDbPoolConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: { rejectUnauthorized: boolean };
};

export function buildMariaDbPoolConfig(rawUrl: string): MariaDbPoolConfig {
  const url = new URL(rawUrl);
  const config: MariaDbPoolConfig = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };

  const sslMode = (
    url.searchParams.get("ssl-mode") ??
    url.searchParams.get("sslmode") ??
    ""
  ).toUpperCase();
  const sslParam = url.searchParams.get("ssl");

  if (sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY") {
    config.ssl = { rejectUnauthorized: true };
  } else if (sslMode === "REQUIRED" || sslMode === "PREFERRED") {
    config.ssl = { rejectUnauthorized: false };
  } else if (sslParam === "true") {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}