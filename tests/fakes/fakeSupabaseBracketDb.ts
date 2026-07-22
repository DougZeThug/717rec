/**
 * A relational in-memory fake of the Supabase client, covering exactly the
 * query surface the bracket subsystem uses. It lets the characterization
 * suite run the REAL BracketManagerService + REAL SupabaseSqlStorage + REAL
 * brackets-manager end-to-end with no network and no mocking of the code
 * under test.
 *
 * Semantics mirrored from Postgres where they matter:
 *  - serial integer ids assigned in insertion order (starting at 1) when a
 *    row is inserted without an id;
 *  - .eq/.neq/.in filters, .maybeSingle()/.single() row modes;
 *  - insert(...).select(...) returns the inserted rows.
 *
 * Anything the fake does not implement throws loudly — a query-surface drift
 * in the production code fails tests instead of silently returning nothing.
 */

type Row = Record<string, unknown>;

type Filter =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'neq'; column: string; value: unknown }
  | { kind: 'in'; column: string; values: unknown[] };

type QueryResult = { data: unknown; error: { message: string; code?: string } | null };

const KNOWN_TABLES = [
  'brackets',
  'stage',
  'group',
  'round',
  'match',
  'match_game',
  'participant',
  'teams',
] as const;

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Filter[] = [];
  private payload: Row | Row[] | null = null;
  private returnInserted = false;
  private rowMode: 'many' | 'single' | 'maybeSingle' = 'many';
  private ordering: { column: string; ascending: boolean } | null = null;

  constructor(
    private readonly db: FakeSupabaseBracketDb,
    private readonly table: string
  ) {}

  select(_columns?: string): this {
    // Column projection is intentionally not applied: production code always
    // reads named fields, and returning full rows can never hide a bug.
    if (this.operation === 'insert') {
      this.returnInserted = true;
    }
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  upsert(): never {
    throw new Error(`fakeSupabaseBracketDb: upsert on "${this.table}" is not implemented`);
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ kind: 'eq', column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ kind: 'neq', column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ kind: 'in', column, values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.ordering = { column, ascending: options?.ascending ?? true };
    return this;
  }

  single(): this {
    this.rowMode = 'single';
    return this;
  }

  maybeSingle(): this {
    this.rowMode = 'maybeSingle';
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      const cell = row[filter.column];
      if (filter.kind === 'eq') return cell === filter.value;
      if (filter.kind === 'neq') return cell !== filter.value;
      return filter.values.includes(cell);
    });
  }

  private execute(): QueryResult {
    const rows = this.db.tableRows(this.table);

    if (this.operation === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const inserted = items.map((item) => this.db.storeRow(this.table, item));
      if (!this.returnInserted) return { data: null, error: null };
      return this.wrapRows(inserted.map((row) => structuredClone(row)));
    }

    if (this.operation === 'update') {
      const targets = rows.filter((row) => this.matches(row));
      for (const row of targets) Object.assign(row, structuredClone(this.payload as Row));
      return { data: null, error: null };
    }

    if (this.operation === 'delete') {
      this.db.replaceRows(
        this.table,
        rows.filter((row) => !this.matches(row))
      );
      return { data: null, error: null };
    }

    let selected = rows.filter((row) => this.matches(row));
    if (this.ordering) {
      const { column, ascending } = this.ordering;
      selected = selected
        .slice()
        .sort(
          (a, b) => ((a[column] as number) > (b[column] as number) ? 1 : -1) * (ascending ? 1 : -1)
        );
    }
    return this.wrapRows(selected.map((row) => structuredClone(row)));
  }

  private wrapRows(selected: Row[]): QueryResult {
    if (this.rowMode === 'maybeSingle') {
      return { data: selected[0] ?? null, error: null };
    }
    if (this.rowMode === 'single') {
      if (selected.length !== 1) {
        return {
          data: null,
          error: {
            message: `single() expected exactly 1 row in "${this.table}", got ${selected.length}`,
            code: 'PGRST116',
          },
        };
      }
      return { data: selected[0], error: null };
    }
    return { data: selected, error: null };
  }
}

export class FakeSupabaseBracketDb {
  private tables = new Map<string, Row[]>();
  private counters = new Map<string, number>();
  readonly rpcCalls: { name: string; args: unknown }[] = [];
  private rpcHandlers = new Map<string, (args: unknown) => QueryResult>();

  /** The object handed to `vi.mock('@/integrations/supabase/client')`. */
  readonly client = {
    from: (table: string): FakeQueryBuilder => {
      if (!(KNOWN_TABLES as readonly string[]).includes(table)) {
        throw new Error(`fakeSupabaseBracketDb: unknown table "${table}"`);
      }
      return new FakeQueryBuilder(this, table);
    },
    rpc: (name: string, args: unknown): Promise<QueryResult> => {
      this.rpcCalls.push({ name, args });
      const handler = this.rpcHandlers.get(name);
      if (!handler) {
        return Promise.resolve({
          data: null,
          error: { message: `fakeSupabaseBracketDb: no rpc handler for "${name}"` },
        });
      }
      return Promise.resolve(handler(args));
    },
    channel: (): never => {
      throw new Error('fakeSupabaseBracketDb: realtime channels are not implemented');
    },
  };

  constructor() {
    this.reset();
    // Default: the server-side finalize RPC reports 0 rows written; tests
    // override via setRpcHandler when they assert the success path.
    this.setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
  }

  reset(): void {
    this.tables.clear();
    this.counters.clear();
    this.rpcCalls.length = 0;
    for (const table of KNOWN_TABLES) this.tables.set(table, []);
  }

  setRpcHandler(name: string, handler: (args: unknown) => QueryResult): void {
    this.rpcHandlers.set(name, handler);
  }

  /** All rows of a table (live references — callers mutate through builders only). */
  tableRows(table: string): Row[] {
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`fakeSupabaseBracketDb: unknown table "${table}"`);
    return rows;
  }

  replaceRows(table: string, rows: Row[]): void {
    this.tables.set(table, rows);
  }

  /** Deep-copied rows for assertions. */
  rows(table: string): Row[] {
    return this.tableRows(table).map((row) => structuredClone(row));
  }

  /** Insert a row, assigning a serial integer id when none is provided. */
  storeRow(table: string, row: Row): Row {
    const stored: Row = structuredClone(row);
    if (stored.id === undefined || stored.id === null) {
      const next = (this.counters.get(table) ?? 0) + 1;
      this.counters.set(table, next);
      stored.id = next;
    }
    this.tableRows(table).push(stored);
    return stored;
  }

  /** Test fixture helper: seed rows exactly as given (ids preserved). */
  seed(table: string, rows: Row[]): void {
    for (const row of rows) this.storeRow(table, row);
  }
}
