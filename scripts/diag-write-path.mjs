/**
 * Mede o caminho de ESCRITA antes de decidir a arquitetura do core operacional.
 *
 * Pergunta: uma sessão de usuária (cookie SSR) consegue criar/alterar/apagar
 * linha em tabela com `permissions: []` e `rowSecurity: true`? Ou toda escrita
 * precisa passar pelo servidor com chave?
 *
 * Não presume: mede create/update/delete pela sessão, tentativa de escalada de
 * permissão na criação, e a leitura cruzada entre duas criadoras. Limpa tudo.
 */
import { Account, Client, ID, Permission, Role, TablesDB, Users } from 'node-appwrite';
import { randomBytes } from 'node:crypto';

const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators';
const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const anon = () => new Client().setEndpoint(endpoint).setProject(project);
const keyed = new Client()
  .setEndpoint(endpoint)
  .setProject(project)
  .setKey(process.env.APPWRITE_TEST_API_KEY);
const db = new TablesDB(keyed);
const users = new Users(keyed);
const runId = `dwp${Date.now().toString(36)}`;
const created = [];
const accounts = [];

const measure = async (label, operation) => {
  try {
    const value = await operation();
    console.log(`${label}: 200`, value?.$id ? `row=${value.$id}` : '');
    return { status: 200, value };
  } catch (error) {
    console.log(`${label}: ${error?.code ?? -1} type=${error?.type ?? ''}`);
    return { status: error?.code ?? -1, value: undefined };
  }
};

async function actor(index) {
  const id = `${runId}-u${index}`;
  const email = `${id}@example.invalid`;
  const password = randomBytes(24).toString('hex');
  await new Account(anon()).create({ userId: id, email, password, name: 'write-path probe' });
  accounts.push(id);
  const session = await new Account(keyed).createEmailPasswordSession({ email, password });
  const client = anon().setSession(session.secret);
  return { id, client, db: new TablesDB(client) };
}

try {
  const a = await actor(0);
  const b = await actor(1);
  const rowA = `${runId}-a`;
  const ownPermissions = [Permission.read(Role.user(a.id)), Permission.update(Role.user(a.id))];

  // 1. Sessão criando linha com permissões escolhidas por ela (também mede escalada).
  const escalation = await measure('sessao.createRow(read(user), update(user))', () =>
    a.db.createRow({
      databaseId,
      tableId: 'notifications',
      rowId: rowA,
      data: {
        userId: a.id,
        type: 'system',
        title: 'probe',
        body: 'probe',
        eventKey: rowA,
      },
      permissions: ownPermissions,
    }),
  );
  if (escalation.status === 200) created.push({ tableId: 'notifications', rowId: rowA });

  const openRow = `${runId}-open`;
  const opened = await measure('sessao.createRow(read("users")) — escalada', () =>
    a.db.createRow({
      databaseId,
      tableId: 'notifications',
      rowId: openRow,
      data: { userId: a.id, type: 'system', title: 'probe', body: 'probe', eventKey: openRow },
      permissions: [Permission.read(Role.users())],
    }),
  );
  if (opened.status === 200) created.push({ tableId: 'notifications', rowId: openRow });

  // 2. Base com chave: a MESMA linha, criada pelo servidor. É o caminho que a
  // aplicação usa hoje (function complete-onboarding) e o candidato natural.
  await measure('chave.createRow(read(user), update(user))', () =>
    db.createRow({
      databaseId,
      tableId: 'notifications',
      rowId: rowA,
      data: { userId: a.id, type: 'system', title: 'probe', body: 'probe', eventKey: rowA },
      permissions: ownPermissions,
    }),
  );
  created.push({ tableId: 'notifications', rowId: rowA });
  await measure('chave.createRow(read(user)) sem update', () =>
    db.createRow({
      databaseId,
      tableId: 'notifications',
      rowId: `${runId}-ro`,
      data: {
        userId: a.id,
        type: 'system',
        title: 'probe',
        body: 'probe',
        eventKey: `${runId}-ro`,
      },
      permissions: [Permission.read(Role.user(a.id))],
    }),
  );
  created.push({ tableId: 'notifications', rowId: `${runId}-ro` });

  // 3. Dono altera a própria linha; outra criadora tenta igual.
  await measure('sessao(A).updateRow propria com update(user)', () =>
    a.db.updateRow({ databaseId, tableId: 'notifications', rowId: rowA, data: { title: 'owned' } }),
  );
  await measure('sessao(A).updateRow propria SEM update(user)', () =>
    a.db.updateRow({
      databaseId,
      tableId: 'notifications',
      rowId: `${runId}-ro`,
      data: { title: 'owned' },
    }),
  );
  await measure('sessao(B).updateRow linha da A', () =>
    b.db.updateRow({
      databaseId,
      tableId: 'notifications',
      rowId: rowA,
      data: { title: 'hijack' },
    }),
  );
  await measure('sessao(B).getRow linha da A', () =>
    b.db.getRow({ databaseId, tableId: 'notifications', rowId: rowA }),
  );
  await measure('sessao(A).getRow propria', () =>
    a.db.getRow({ databaseId, tableId: 'notifications', rowId: rowA }),
  );
  await measure('sessao(B).listRows sem filtro', () =>
    b.db.listRows({ databaseId, tableId: 'notifications' }),
  );
  await measure('sessao(A).deleteRow propria com update(user)', () =>
    a.db.deleteRow({ databaseId, tableId: 'notifications', rowId: rowA }),
  );

  // 4. Transação pela sessão: o núcleo transacional exige privilégio?
  await measure('sessao(A).createTransaction', () => a.db.createTransaction({ ttl: 120 }));
} finally {
  for (const row of created) {
    try {
      await db.deleteRow({ databaseId, ...row });
    } catch {
      /* já apagada pela sessão */
    }
  }
  for (const userId of accounts) {
    try {
      await users.delete({ userId });
    } catch {
      /* nada */
    }
  }
  console.log(`limpeza: ${created.length} linhas, ${accounts.length} contas (${runId})`);
}
