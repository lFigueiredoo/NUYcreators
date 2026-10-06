/**
 * Tipos do ajudante de pilha (`stack.mjs`).
 *
 * O ajudante é JavaScript puro porque roda direto no Node fora do build; aqui
 * fica só a assinatura que os testes escritos em TypeScript consomem.
 */
export type StubHandle = {
  port: number;
  endpoint: string;
  dataset: { users: { id: string; email: string }[] };
  /** Registro das requisições atendidas — usado para provar o escopo das consultas. */
  journal: {
    method: string;
    path: string;
    search: string;
    userId: string | null;
    admin: boolean;
    at: string;
  }[];
  close: () => Promise<void>;
};

export type StackHandle = {
  stub: StubHandle;
  app: unknown;
  origin: string;
  close: () => Promise<void>;
};

export const TEST_ORIGIN: string;

export function startStack(options?: { startApp?: boolean }): Promise<StackHandle>;
