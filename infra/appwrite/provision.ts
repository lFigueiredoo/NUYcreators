import {
  Client,
  Functions,
  Permission,
  Role,
  Runtime,
  Storage,
  TablesDB,
  TablesDBIndexType,
  Teams,
} from 'node-appwrite';
import {
  tables,
  buckets,
  team,
  levelSeed,
  schemaVersion,
  databaseName,
  functionDefinitions,
  executeRoles,
  functionScopes,
  type Column,
} from './schema';
import { parseEnvironment } from '../../src/lib/env/schema';
import { bucketPermissions } from '../../src/lib/security/permissions';
import { assertDedicatedProject } from './safety';
import {
  verifyReadOnlyIdentity,
  recordBootstrap,
  APPLICATION_ID,
  MARKER_ID,
  MARKER_KEY,
  markerMatches,
  IdentityError,
} from './identity';
import {
  buildPlan,
  formatPlan,
  indexKey,
  summarize,
  sortedEqual,
  tableWriteArgs,
  TEAM_NAME,
  type PlanAction,
  type PlanKind,
} from './plan';

// No network, credentials or project creation in plan mode.
const apply = process.argv.includes('--apply');
// Sem esta flag, divergência de segurança interrompe o apply: corrigir acesso
// sozinho esconderia uma alteração que ninguém pediu.
const reconcileSecurity = process.argv.includes('--reconcile-security');

try {
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          version: schemaVersion,
          tables,
          buckets,
          team,
          functions: functionDefinitions,
          seeds: levelSeed,
          tablePermissions: [],
          fileSecurity: true,
          rowSecurity: true,
        },
        null,
        2,
      ),
    );
  } else {
    assertDedicatedProject(process.env);
    const identity = await verifyReadOnlyIdentity(process.env);
    const env = parseEnvironment(process.env);
    if (!env.APPWRITE_ENDPOINT || !env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY)
      throw new IdentityError(
        'Configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY no ambiente seguro.',
      );
    if (process.env.APPWRITE_DEDICATED_PROJECT_CONFIRMED !== 'true')
      throw new IdentityError(
        'Confirme o projeto dedicado com APPWRITE_DEDICATED_PROJECT_CONFIRMED=true.',
      );
    const client = new Client()
      .setEndpoint(env.APPWRITE_ENDPOINT)
      .setProject(env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const db = new TablesDB(client);
    const storage = new Storage(client);
    const teams = new Teams(client);
    const functions = new Functions(client);
    const databaseId = env.APPWRITE_DATABASE_ID;

    // O plano é a única fonte do que será escrito. Nada é decidido por leitura
    // solta no meio da escrita: o que o operador viu é o que o apply faz.
    const plan = await buildPlan({ db, storage, teams, functions }, databaseId, identity);
    console.log(formatPlan(plan));
    const summary = summarize(plan);
    if (summary.immutableDrift || summary.blocked)
      throw new IdentityError(
        `${summary.immutableDrift} divergência(s) imutável(is) e ${summary.blocked} bloqueio(s) de escopo. Apply interrompido antes de qualquer escrita; nada foi criado, alterado ou apagado.`,
      );
    if (summary.securityDrift && !reconcileSecurity)
      throw new IdentityError(
        `${summary.securityDrift} divergência(s) de segurança. Corrigir exige --reconcile-security explícito, que reconcilia apenas os campos de acesso gerenciados pelo manifesto. Apply interrompido antes de qualquer escrita.`,
      );

    const actionOf = (kind: PlanKind, id: string): PlanAction =>
      plan.find((entry) => entry.kind === kind && entry.id === id)?.action ?? 'NOOP';

    const createColumn = (column: Column, tableId: string) => {
      const params = {
        databaseId,
        tableId,
        key: column.key,
        required: column.required,
      };
      if (column.type === 'integer') return db.createIntegerColumn(params);
      if (column.type === 'boolean') return db.createBooleanColumn(params);
      if (column.type === 'datetime') return db.createDatetimeColumn(params);
      return db.createVarcharColumn({ ...params, size: column.size ?? 255 });
    };

    /**
     * Colunas e índices são assíncronos no Appwrite. A espera é sobre o
     * manifesto inteiro, não sobre o que esta run criou: uma run anterior pode
     * ter deixado um índice processando, e o "pronto" do provisioner não pode
     * ser mais otimista que o schema real.
     */
    async function waitForColumns(tableId: string, expected: number) {
      for (let attempt = 0; ; attempt++) {
        const columns = await db.listColumns({ databaseId, tableId });
        if (columns.columns.some((item) => item.status === 'failed'))
          throw new IdentityError(`Coluna falhou em ${tableId}`);
        if (
          columns.columns.every((item) => item.status === 'available') &&
          columns.total >= expected
        )
          return;
        if (attempt >= 90) throw new IdentityError(`Timeout de colunas: ${tableId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    async function waitForIndex(tableId: string, key: string) {
      for (let attempt = 0; ; attempt++) {
        const index = await db.getIndex({ databaseId, tableId, key });
        if (index.status === 'available') return;
        if (index.status === 'failed' || attempt >= 90)
          throw new IdentityError(`Índice indisponível: ${tableId}.${key}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await recordBootstrap(identity, 'in_progress');
    const databaseAction = actionOf('database', databaseId);
    if (databaseAction === 'CREATE') await db.create({ databaseId, name: databaseName });
    else if (databaseAction === 'UPDATE') await db.update({ databaseId, name: databaseName });

    const teamAction = actionOf('team', team.id);
    if (teamAction === 'CREATE') await teams.create({ teamId: team.id, name: TEAM_NAME });
    else if (teamAction === 'UPDATE') await teams.updateName({ teamId: team.id, name: TEAM_NAME });

    for (const table of tables) {
      const tableId = table.id;
      const tableAction = actionOf('table', tableId);
      // CREATE, UPDATE e DRIFT_SECURITY escrevem o MESMO payload: a postura de
      // acesso não pode ficar de fora de um update que só queria corrigir o nome
      // de exibição — `updateTable` reinicia booleano omitido.
      const tableWrite = tableWriteArgs(tableAction, databaseId, tableId);
      if (tableWrite && tableAction === 'CREATE') await db.createTable(tableWrite);
      else if (tableWrite) {
        // Só chega a DRIFT_SECURITY com --reconcile-security: o payload é o mesmo
        // do update comum, o que muda é o plano ter autorizado mexer em acesso.
        await db.updateTable(tableWrite);
        if (tableAction === 'DRIFT_SECURITY') console.log(`RECONCILED_SECURITY table ${tableId}`);
      }

      for (const column of table.columns)
        if (actionOf('column', `${tableId}.${column.key}`) === 'CREATE')
          await createColumn(column, tableId);
      await waitForColumns(tableId, table.columns.length);

      for (const [unique, groups] of [
        [true, table.unique],
        [false, table.indexes],
      ] as const) {
        for (const columns of groups) {
          const key = indexKey(unique, columns);
          if (actionOf('index', `${tableId}.${key}`) === 'CREATE')
            await db.createIndex({
              databaseId,
              tableId,
              key,
              type: unique ? TablesDBIndexType.Unique : TablesDBIndexType.Key,
              columns,
            });
          await waitForIndex(tableId, key);
        }
      }
      console.log(`Schema preparado: ${tableId}`);
    }

    for (const bucket of buckets) {
      const bucketAction = actionOf('bucket', bucket.id);
      if (bucketAction === 'CREATE') {
        await storage.createBucket({
          bucketId: bucket.id,
          name: bucket.id,
          permissions: bucketPermissions,
          fileSecurity: true,
          maximumFileSize: bucket.size,
          allowedFileExtensions: bucket.extensions,
          encryption: true,
          antivirus: true,
        });
      } else if (bucketAction === 'UPDATE' || bucketAction === 'DRIFT_SECURITY') {
        await storage.updateBucket({
          bucketId: bucket.id,
          name: bucket.id,
          permissions: bucketPermissions,
          fileSecurity: true,
          enabled: true,
          maximumFileSize: bucket.size,
          allowedFileExtensions: bucket.extensions,
          encryption: true,
          antivirus: true,
        });
        if (bucketAction === 'DRIFT_SECURITY')
          console.log(`RECONCILED_SECURITY bucket ${bucket.id}`);
      }
    }

    for (const [order, level] of levelSeed.entries()) {
      const { id, ...data } = level;
      const fields = { ...data, order, active: true, rulesVersion: schemaVersion };
      const seedAction = actionOf('seed', id);
      if (seedAction === 'CREATE')
        await db.createRow({
          databaseId,
          tableId: 'creator_levels',
          rowId: id,
          data: fields,
          permissions: [Permission.read(Role.any())],
        });
      else if (seedAction === 'UPDATE' || seedAction === 'DRIFT_SECURITY') {
        await db.updateRow({
          databaseId,
          tableId: 'creator_levels',
          rowId: id,
          data: fields,
          permissions: [Permission.read(Role.any())],
        });
        if (seedAction === 'DRIFT_SECURITY') console.log(`RECONCILED_SECURITY seed ${id}`);
      }
    }

    // A postura de execução de cada function sai do MANIFESTO: quem pode
    // executar (`execute`), se o container está habilitado, quais escopos a
    // chave dinâmica recebe e qual agenda faz o trabalho andar sozinho.
    for (const definition of functionDefinitions) {
      const functionAction = actionOf('function', definition.id);
      const scopes = functionScopes(definition);
      const execute = executeRoles(definition.audience);
      const enabled = definition.audience !== 'closed';
      if (functionAction === 'NOOP') continue;
      const params = {
        functionId: definition.id,
        name: `NUY ${definition.id}`,
        runtime: Runtime.Node22,
        execute,
        enabled,
        entrypoint: 'src/main.js',
        commands: 'npm ci',
        scopes,
        schedule: definition.schedule ?? '',
      };
      if (functionAction === 'CREATE') await functions.create(params);
      else {
        await functions.update(params);
        if (functionAction === 'DRIFT_SECURITY')
          console.log(`RECONCILED_SECURITY function ${definition.id}`);
      }
      // Confere no SERVIDOR, não no que pedimos: o que ficou gravado tem de ser
      // exatamente a postura declarada. Um cliente executável a mais — ou a
      // menos — é divergência de acesso que ninguém pediu.
      const result = await functions.get({ functionId: definition.id });
      const divergences: string[] = [];
      if (result.enabled !== enabled) divergences.push(`enabled=${result.enabled}`);
      if (!sortedEqual(result.execute, execute))
        divergences.push(`execute=[${result.execute.join(', ')}]`);
      if (!sortedEqual(result.scopes, scopes))
        divergences.push(`scopes=[${result.scopes.join(', ')}]`);
      if (divergences.length)
        throw new IdentityError(
          `Function ${definition.id} divergiu do manifesto: ${divergences.join('; ')}. ` +
            `Esperado: enabled=${enabled}, execute=[${execute.join(', ')}], scopes=[${scopes.join(', ')}].`,
        );
      if (definition.schedule && result.schedule !== definition.schedule)
        throw new IdentityError(
          `Agenda divergente em ${definition.id}: "${result.schedule}" (esperado "${definition.schedule}").`,
        );
    }

    if (actionOf('marker', MARKER_ID) === 'CREATE') {
      if (identity.marker === 'verified')
        throw new IdentityError(
          'Marker sumiu durante provisionamento; recriação automática bloqueada.',
        );
      const marker = await db.createRow({
        databaseId,
        tableId: 'platform_settings',
        rowId: MARKER_ID,
        data: {
          key: MARKER_KEY,
          valueJson: JSON.stringify({
            applicationId: APPLICATION_ID,
            projectId: identity.projectId,
          }),
          public: false,
        },
        permissions: [],
      });
      if (!markerMatches(marker as unknown as Record<string, unknown>, identity.projectId))
        throw new IdentityError('Marker final divergente; não será sobrescrito.');
    }
    await recordBootstrap(identity, 'completed');
    console.log(
      'Base preparada. Functions NÃO publicadas/ativadas. Execute revisão de staging antes da conexão.',
    );
  }
} catch (error) {
  // SDK/network exceptions can carry bodies or request headers. Never dump them.
  if (error instanceof IdentityError) console.error(error.message);
  else {
    const code = (error as { code?: unknown })?.code;
    console.error(
      `Provisionamento interrompido antes da conclusão${typeof code === 'number' && code >= 100 && code <= 599 ? ` (HTTP ${code})` : ''}. Verifique preflight e drift do schema; nenhuma credencial/response foi registrada.`,
    );
  }
  process.exitCode = 1;
}
