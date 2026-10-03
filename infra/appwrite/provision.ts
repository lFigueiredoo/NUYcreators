import {
  Client,
  Databases,
  DatabasesIndexType,
  Functions,
  Permission,
  Role,
  Runtime,
  Storage,
  Teams,
  ProjectKeyScopes,
} from 'node-appwrite';
import {
  collections,
  buckets,
  team,
  levelSeed,
  schemaVersion,
  functionDefinitions,
} from './schema';
import { parseEnvironment } from '../../src/lib/env/schema';
import { collectionPermissions, bucketPermissions } from '../../src/lib/security/permissions';

// No network, credentials or project creation in plan mode.
const apply = process.argv.includes('--apply');
if (!apply) {
  console.log(
    JSON.stringify(
      {
        version: schemaVersion,
        collections,
        buckets,
        team,
        functions: functionDefinitions,
        seeds: levelSeed,
        collectionPermissions: [],
        fileSecurity: true,
        documentSecurity: true,
      },
      null,
      2,
    ),
  );
} else {
  const env = parseEnvironment(process.env);
  if (!env.APPWRITE_ENDPOINT || !env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY)
    throw new Error(
      'Configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY no ambiente seguro.',
    );
  if (process.env.APPWRITE_DEDICATED_PROJECT_CONFIRMED !== 'true')
    throw new Error('Confirme o projeto dedicado com APPWRITE_DEDICATED_PROJECT_CONFIRMED=true.');
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const db = new Databases(client);
  const storage = new Storage(client);
  const teams = new Teams(client);
  const functions = new Functions(client);
  const databaseId = env.APPWRITE_DATABASE_ID;
  // Existing resources are inspected; mismatches fail rather than overwrite.
  async function exists<T>(read: () => Promise<T>, create: () => Promise<T>): Promise<T> {
    try {
      return await read();
    } catch (error) {
      if ((error as { code?: number }).code !== 404) throw error;
      return create();
    }
  }
  await exists(
    () => db.get({ databaseId }),
    () => db.create({ databaseId, name: 'NUY Creators' }),
  );
  await exists(
    () => teams.get({ teamId: team.id }),
    // Appwrite roles belong to memberships, not a global team role registry.
    () => teams.create({ teamId: team.id, name: 'NUY Creators — Equipe' }),
  );
  for (const collection of collections) {
    const collectionId = collection.id;
    const result = await exists(
      () => db.getCollection({ databaseId, collectionId }),
      () =>
        db.createCollection({
          databaseId,
          collectionId,
          name: collectionId,
          permissions: collectionPermissions,
          documentSecurity: true,
        }),
    );
    if (result.$permissions.length || !result.documentSecurity)
      throw new Error(`Permissões divergentes: ${collectionId}. Revisão manual exigida.`);
    for (const attribute of collection.attributes) {
      const params = { databaseId, collectionId, key: attribute.key, required: attribute.required };
      const value = await exists(
        () => db.getAttribute({ databaseId, collectionId, key: attribute.key }),
        () => {
          if (attribute.type === 'integer') return db.createIntegerAttribute(params);
          if (attribute.type === 'boolean') return db.createBooleanAttribute(params);
          if (attribute.type === 'datetime') return db.createDatetimeAttribute(params);
          return db.createStringAttribute({ ...params, size: attribute.size ?? 255 });
        },
      );
      if (
        value.type !== attribute.type ||
        ('required' in value && value.required !== attribute.required)
      )
        throw new Error(`Schema divergente: ${collectionId}.${attribute.key}`);
      if (attribute.type === 'string' && 'size' in value && value.size !== attribute.size)
        throw new Error(`Tamanho divergente: ${collectionId}.${attribute.key}`);
    }
    // Attributes are asynchronous in Appwrite; indexes must wait for availability.
    for (let attempt = 0; ; attempt++) {
      const attributes = await db.listAttributes({ databaseId, collectionId });
      if (attributes.attributes.some((a) => a.status === 'failed'))
        throw new Error(`Atributo falhou em ${collectionId}`);
      if (
        attributes.attributes.every((a) => a.status === 'available') &&
        attributes.total >= collection.attributes.length
      )
        break;
      if (attempt >= 90) throw new Error(`Timeout de atributos: ${collectionId}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    for (const [unique, groups] of [
      [true, collection.unique],
      [false, collection.indexes],
    ] as const) {
      for (const attributes of groups) {
        const key = `${unique ? 'u' : 'i'}_${attributes.join('_').replace('$', '')}`.slice(0, 36);
        const result = await exists(
          () => db.getIndex({ databaseId, collectionId, key }),
          () =>
            db.createIndex({
              databaseId,
              collectionId,
              key,
              type: unique ? DatabasesIndexType.Unique : DatabasesIndexType.Key,
              attributes,
            }),
        );
        if (
          result.type !== (unique ? 'unique' : 'key') ||
          JSON.stringify(result.attributes) !== JSON.stringify(attributes)
        )
          throw new Error(`Índice divergente: ${collectionId}.${key}`);
        for (let attempt = 0; ; attempt++) {
          const index = await db.getIndex({ databaseId, collectionId, key });
          if (index.status === 'available') break;
          if (index.status === 'failed' || attempt >= 90)
            throw new Error(`Índice indisponível: ${collectionId}.${key}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
    console.log(`Schema preparado: ${collectionId}`);
  }
  for (const bucket of buckets) {
    const result = await exists(
      () => storage.getBucket({ bucketId: bucket.id }),
      () =>
        storage.createBucket({
          bucketId: bucket.id,
          name: bucket.id,
          permissions: bucketPermissions,
          fileSecurity: true,
          maximumFileSize: bucket.size,
          allowedFileExtensions: bucket.extensions,
          encryption: true,
          antivirus: true,
        }),
    );
    if (result.$permissions.length || !result.fileSecurity)
      throw new Error(`Permissões divergentes no bucket ${bucket.id}`);
  }
  for (const [order, level] of levelSeed.entries()) {
    const { id, ...data } = level;
    const result = await exists(
      () => db.getDocument({ databaseId, collectionId: 'creator_levels', documentId: id }),
      () =>
        db.createDocument({
          databaseId,
          collectionId: 'creator_levels',
          documentId: id,
          data: { ...data, order, active: true, rulesVersion: schemaVersion },
          permissions: [Permission.read(Role.any())],
        }),
    );
    if (
      result.minPoints !== data.minPoints ||
      result.maxPoints !== data.maxPoints ||
      result.name !== data.name
    )
      throw new Error(`Configuração de nível divergente: ${id}. Não sobrescrita.`);
  }
  // Containers disabled until deployment and staging review. No public execute role.
  for (const definition of functionDefinitions) {
    await exists(
      () => functions.get({ functionId: definition.id }),
      () =>
        functions.create({
          functionId: definition.id,
          name: `NUY ${definition.id}`,
          runtime: Runtime.Node22,
          execute: [],
          enabled: false,
          entrypoint: 'src/main.js',
          commands: 'npm ci',
          scopes: definition.implemented
            ? [ProjectKeyScopes.DocumentsRead, ProjectKeyScopes.DocumentsWrite]
            : [],
        }),
    );
  }
  console.log(
    'Base preparada. Functions NÃO publicadas/ativadas. Execute revisão de staging antes da conexão.',
  );
}
