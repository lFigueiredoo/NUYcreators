/**
 * Tipos do ajudante de pilha conectada (`staging-stack.mjs`).
 *
 * O ajudante é JavaScript puro porque roda direto no Node fora do build; aqui
 * fica só a assinatura que o QA conectado, escrito em TypeScript, consome.
 */
export type ConnectedStack = {
  app: unknown;
  origin: string;
  close: () => Promise<void>;
};

export const STAGING_ORIGIN: string;

export function startConnectedStack(): Promise<ConnectedStack>;
