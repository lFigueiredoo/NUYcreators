export function startStub(options?: { port?: number; now?: Date; academyFixture?: boolean }): Promise<{
  server: import('node:https').Server;
  port: number;
  endpoint: string;
  dataset: { tables: Record<string, (Record<string, unknown> & { $id: string })[]> };
  journal: Record<string, unknown>[];
  close: () => Promise<void>;
}>;
