type Value = string | number | null;
type StatementResult = {
  success: boolean;
  results: Record<string, unknown>[];
  meta: { changes: number };
};

// Adapt the existing parameterized business queries without changing role checks.
// The RPC is callable only by service_role and executes a batch in one transaction.
export function postgresQuery(sql: string) {
  let result = sql.replace(
    /\b(sessions|login_limits|facilities|tasks|events|audit)\b/g,
    'route_rescue.$1',
  );
  result = result.replace(
    /lower\(hex\(randomblob\(16\)\)\)/g,
    "replace(gen_random_uuid()::text,'-','')",
  );
  if (result.startsWith('INSERT INTO route_rescue.login_limits(')) {
    result = result
      .replaceAll('CASE WHEN until<', 'CASE WHEN login_limits.until<')
      .replaceAll('ELSE count+1', 'ELSE login_limits.count+1')
      .replaceAll('ELSE until END', 'ELSE login_limits.until END');
  }
  if (/^INSERT OR IGNORE\b/.test(result)) {
    result = result.replace(/^INSERT OR IGNORE\b/, 'INSERT') + ' ON CONFLICT DO NOTHING';
  }
  return result;
}

export function createCloudDatabase(config: {
  url?: string;
  serviceKey?: string;
  project?: string;
}) {
  if (!config.url || !config.serviceKey)
    throw new Error('Meoo persistent database credentials are required on the server');
  const endpoint = new URL(config.url.replace(/\/+$/, '') + '/rest/v1/rpc/route_rescue_execute');
  if (endpoint.protocol !== 'https:') throw new Error('The persistent database requires HTTPS');

  async function execute(statements: Statement[]): Promise<StatementResult[]> {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.serviceKey!,
          Authorization: 'Bearer ' + config.serviceKey!,
          ...(config.project ? { 'OneDay-App-Id': config.project } : {}),
        },
        body: JSON.stringify({
          statements: statements.map((s) => ({ sql: postgresQuery(s.sql), args: s.args })),
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (response.status !== 429 || attempt === 2) break;
      const after = response.headers.get('retry-after');
      const wait = after
        ? Number.isFinite(Number(after))
          ? Number(after) * 1000
          : Date.parse(after) - Date.now()
        : 1000 * (attempt + 1);
      if (!Number.isFinite(wait) || wait > 5000) break;
      await response.arrayBuffer();
      await new Promise((resolve) => setTimeout(resolve, Math.max(1000, wait)));
    }
    if (!response!.ok) {
      let code = 'unknown';
      try {
        const body = (await response!.json()) as { code?: unknown };
        if (typeof body.code === 'string') code = body.code;
      } catch {}
      throw new Error(`Persistent database failed (${response!.status}, ${code})`);
    }
    return response!.json();
  }

  class Statement {
    constructor(
      readonly sql: string,
      readonly args: Value[] = [],
    ) {}
    bind(...args: Value[]) {
      return new Statement(this.sql, args);
    }
    async first<T>() {
      return ((await execute([this]))[0].results[0] as T | undefined) ?? null;
    }
    async all<T>() {
      const r = (await execute([this]))[0];
      return { ...r, results: r.results as T[] };
    }
    async run() {
      return (await execute([this]))[0];
    }
  }
  return { prepare: (sql: string) => new Statement(sql), batch: execute };
}
