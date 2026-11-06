import { describe, expect, it, vi } from 'vitest';
import {
  APPROVAL_PRODUCTION_FUNCTIONS,
  assertApprovalFunctionPosture,
  assertProductionDeploymentTarget,
  deployApprovalProduction,
  parseProductionDeploymentArgs,
} from '../../infra/appwrite/deploy-approval-production';
import { PRODUCTION_PROTECTED_PROJECT_ID } from '../../src/lib/env/protected-project';

const SHA = 'a'.repeat(40);
const EXPECTED_TERMS = 'approved-terms-v1';
const args = { projectId: PRODUCTION_PROTECTED_PROJECT_ID, commit: SHA, apply: false };
const env = {
  APPWRITE_ENDPOINT: 'https://api.example.test/v1',
  APPWRITE_PROJECT_ID: PRODUCTION_PROTECTED_PROJECT_ID,
  APPWRITE_EXPECTED_PROJECT_ID: PRODUCTION_PROTECTED_PROJECT_ID,
  APPWRITE_DATABASE_ID: 'nuy-creators',
  APPWRITE_API_KEY: 'test-not-a-credential',
  APPWRITE_OPS_API_KEY: 'test-not-a-credential',
  NUY_MINIMUM_AGE: '18',
};

const posture = (id: string, deploymentId = `old-${id}`) => ({
  $id: id,
  enabled: true,
  execute: ['users'],
  scopes: ['rows.read', 'rows.write'],
  runtime: 'node-22',
  entrypoint: 'src/main.js',
  commands: 'npm ci',
  schedule: '',
  deploymentId,
});

function harness() {
  const active = new Map(APPROVAL_PRODUCTION_FUNCTIONS.map((id) => [id, `old-${id}`]));
  const events: string[] = [];
  let changedDuringBuild = false;
  let publicMarker = false;
  let broadTable = false;
  let buildFails = false;
  let policyMutatesDuringBuild = false;
  let dropTermsDuringBuild = false;
  let ignoreTermsUpdate = false;
  const variables = new Map([
    [
      'NUY_TERMS_VERSION',
      {
        $id: 'terms-var',
        key: 'NUY_TERMS_VERSION',
        value: EXPECTED_TERMS,
        secret: false,
        resourceType: 'function',
        resourceId: 'complete-onboarding',
        $updatedAt: '2026-11-06T12:00:00.000Z',
      },
    ],
    [
      'NUY_MINIMUM_AGE',
      {
        $id: 'age-var',
        key: 'NUY_MINIMUM_AGE',
        value: '18',
        secret: false,
        resourceType: 'function',
        resourceId: 'complete-onboarding',
        $updatedAt: '2026-11-06T12:00:00.000Z',
      },
    ],
    [
      'UNRELATED_SECRET',
      {
        $id: 'unrelated-var',
        key: 'UNRELATED_SECRET',
        value: 'test-value-not-a-secret',
        secret: true,
        resourceType: 'function',
        resourceId: 'complete-onboarding',
        $updatedAt: '2026-11-06T12:00:00.000Z',
      },
    ],
  ]);
  const functions = {
    listVariables: vi.fn(
      async ({ functionId, queries }: { functionId: string; queries: string[] }) => {
        expect(functionId).toBe('complete-onboarding');
        const keys = (
          queries.map((q) => JSON.parse(q)) as {
            method: string;
            attribute: string;
            values: string[];
          }[]
        ).find((q) => q.method === 'equal' && q.attribute === 'key')!.values;
        expect(keys).toEqual(['NUY_TERMS_VERSION', 'NUY_MINIMUM_AGE']);
        if (policyMutatesDuringBuild && events.some((e) => e.startsWith('upload:'))) {
          const value = variables.get('NUY_TERMS_VERSION')!;
          variables.set('NUY_TERMS_VERSION', { ...value, $updatedAt: '2026-11-06T12:02:00.000Z' });
        }
        return {
          variables: structuredClone(
            [...variables.values()].filter(
              (v) =>
                keys.includes(v.key) &&
                !(
                  dropTermsDuringBuild &&
                  events.some((e) => e.startsWith('upload:')) &&
                  v.key === 'NUY_TERMS_VERSION'
                ),
            ),
          ),
        };
      },
    ),
    updateVariable: vi.fn(
      async ({
        functionId,
        variableId,
        key,
        value,
        secret,
      }: {
        functionId: string;
        variableId: string;
        key: string;
        value: string;
        secret: boolean;
      }) => {
        expect({ functionId, variableId, key }).toEqual({
          functionId: 'complete-onboarding',
          variableId: 'terms-var',
          key: 'NUY_TERMS_VERSION',
        });
        const prior = variables.get(key)!;
        events.push('align:complete-onboarding:NUY_TERMS_VERSION');
        if (!ignoreTermsUpdate)
          variables.set(key, { ...prior, value, secret, $updatedAt: '2026-11-06T12:01:00.000Z' });
        return variables.get(key);
      },
    ),
    get: vi.fn(
      async ({ functionId }: { functionId: (typeof APPROVAL_PRODUCTION_FUNCTIONS)[number] }) =>
        posture(
          functionId,
          changedDuringBuild && events.some((e) => e.startsWith('upload:'))
            ? 'other-rollout'
            : active.get(functionId),
        ),
    ),
    getDeployment: vi.fn(async ({ deploymentId }: { deploymentId: string }) => ({
      $id: deploymentId,
      status: buildFails && deploymentId.startsWith('new-') ? 'failed' : 'ready',
    })),
    createDeployment: vi.fn(
      async ({ functionId, activate }: { functionId: string; activate: boolean }) => {
        if (activate !== false) throw new Error('must upload inactive');
        events.push(`upload:${functionId}`);
        return { $id: `new-${functionId}`, status: 'ready' };
      },
    ),
    updateFunctionDeployment: vi.fn(
      async ({
        functionId,
        deploymentId,
      }: {
        functionId: (typeof APPROVAL_PRODUCTION_FUNCTIONS)[number];
        deploymentId: string;
      }) => {
        events.push(`activate:${functionId}`);
        active.set(functionId, deploymentId);
        return posture(functionId, deploymentId);
      },
    ),
  };
  const markers = {
    getRow: vi.fn(async () => ({
      $id: 'application-identity',
      key: 'applicationId',
      public: publicMarker,
      $permissions: [],
      valueJson: JSON.stringify({
        applicationId: 'nuy-creators',
        projectId: PRODUCTION_PROTECTED_PROJECT_ID,
      }),
    })),
  };
  const schema = {
    getTable: vi.fn(async () => ({
      $id: 'platform_settings',
      rowSecurity: true,
      $permissions: broadTable ? ['read("any")'] : [],
    })),
  };
  const dispose = vi.fn(async () => {});
  const packageCommit = vi.fn(async () => ({
    artifacts: APPROVAL_PRODUCTION_FUNCTIONS.map((functionId) => ({
      functionId,
      path: `C:/test-fixtures/${functionId}.tar.gz`,
      bytes: 100,
      sha256: 'b'.repeat(64),
    })),
    dispose,
  }));
  return {
    events,
    functions,
    markers,
    schema,
    packageCommit,
    dispose,
    variables,
    remote: { functions, markers, schema } as never,
    changeDuringBuild: () => {
      changedDuringBuild = true;
    },
    publicMarker: () => {
      publicMarker = true;
    },
    broadTable: () => {
      broadTable = true;
    },
    failBuild: () => {
      buildFails = true;
    },
    mutatePolicyDuringBuild: () => {
      policyMutatesDuringBuild = true;
    },
    dropTermsDuringBuild: () => {
      dropTermsDuringBuild = true;
    },
    ignoreTermsUpdate: () => {
      ignoreTermsUpdate = true;
    },
  };
}

function options(h: ReturnType<typeof harness>) {
  return {
    head: () => SHA,
    remote: h.remote,
    packageCommit: h.packageCommit,
    resolveTermsVersion: vi.fn(() => EXPECTED_TERMS),
  };
}

describe('code-only production approval rollout guard', () => {
  it('has a fixed allowlist with the three security gates activated before onboarding', () => {
    expect(APPROVAL_PRODUCTION_FUNCTIONS).toEqual([
      'join-challenge',
      'submit-content',
      'redeem-reward',
      'complete-onboarding',
    ]);
    expect(
      parseProductionDeploymentArgs(['--project-id', args.projectId, '--commit', SHA]),
    ).toEqual(args);
    expect(() =>
      parseProductionDeploymentArgs([
        '--project-id',
        args.projectId,
        '--commit',
        SHA,
        '--function-id',
        'admin-console',
      ]),
    ).toThrow();
    expect(() =>
      parseProductionDeploymentArgs([
        '--project-id',
        args.projectId,
        '--commit',
        SHA,
        '--apply',
        '--apply',
      ]),
    ).toThrow();
  });

  it('binds the explicit production ID, complete commit and current HEAD exactly', () => {
    expect(() => assertProductionDeploymentTarget(env, args, SHA)).not.toThrow();
    expect(() =>
      assertProductionDeploymentTarget(env, { ...args, projectId: 'another-project' }, SHA),
    ).toThrow();
    expect(() =>
      assertProductionDeploymentTarget(
        { ...env, APPWRITE_EXPECTED_PROJECT_ID: 'another-project' },
        args,
        SHA,
      ),
    ).toThrow();
    expect(() =>
      assertProductionDeploymentTarget(env, { ...args, commit: SHA.slice(0, 7) }, SHA),
    ).toThrow();
    expect(() => assertProductionDeploymentTarget(env, args, 'b'.repeat(40))).toThrow();
    expect(() =>
      assertProductionDeploymentTarget(
        { ...env, APPWRITE_ENDPOINT: 'https://api.example.test/v1?token=x' },
        args,
        SHA,
      ),
    ).toThrow();
    expect(() =>
      assertProductionDeploymentTarget({ ...env, APPWRITE_DATABASE_ID: 'other-db' }, args, SHA),
    ).toThrow();
  });

  it('rejects changes to execution audience, scopes, schedule, runtime or build posture', () => {
    const id = 'complete-onboarding';
    expect(() => assertApprovalFunctionPosture(posture(id) as never, id)).not.toThrow();
    for (const patch of [
      { execute: ['any'] },
      { enabled: false },
      { scopes: ['rows.read', 'rows.write', 'teams.read'] },
      { runtime: 'node-20' },
      { entrypoint: 'other.js' },
      { commands: 'npm install' },
      { schedule: '* * * * *' },
    ])
      expect(() =>
        assertApprovalFunctionPosture({ ...posture(id), ...patch } as never, id),
      ).toThrow();
  });

  it('defaults to a read-only plan without packaging, uploads or activation', async () => {
    const h = harness();
    const setup = options(h);
    const result = await deployApprovalProduction(env, args, setup);
    expect(result).toMatchObject({ mode: 'plan', commit: SHA, changed: false });
    expect(result.previous).toHaveLength(4);
    expect(h.markers.getRow).toHaveBeenCalledOnce();
    expect(h.schema.getTable).toHaveBeenCalledOnce();
    expect(h.packageCommit).not.toHaveBeenCalled();
    expect(h.functions.createDeployment).not.toHaveBeenCalled();
    expect(h.functions.updateFunctionDeployment).not.toHaveBeenCalled();
    expect(h.functions.updateVariable).not.toHaveBeenCalled();
    expect(setup.resolveTermsVersion).toHaveBeenCalledWith(expect.any(String), SHA);
  });

  it.each(['marker', 'table'])(
    'blocks on a non-private %s before any package or write',
    async (kind) => {
      const h = harness();
      if (kind === 'marker') h.publicMarker();
      else h.broadTable();
      await expect(
        deployApprovalProduction(env, { ...args, apply: true }, options(h)),
      ).rejects.toThrow();
      expect(h.packageCommit).not.toHaveBeenCalled();
      expect(h.functions.createDeployment).not.toHaveBeenCalled();
    },
  );

  it('uploads all four packages inactive, then activates gates first and onboarding last', async () => {
    const h = harness();
    const result = await deployApprovalProduction(env, { ...args, apply: true }, options(h));
    expect(h.events).toEqual([
      ...APPROVAL_PRODUCTION_FUNCTIONS.map((id) => `upload:${id}`),
      ...APPROVAL_PRODUCTION_FUNCTIONS.map((id) => `activate:${id}`),
    ]);
    expect(result).toMatchObject({ mode: 'applied', changed: true });
    expect(result.previous.map((item) => item.previousDeploymentId)).toEqual(
      APPROVAL_PRODUCTION_FUNCTIONS.map((id) => `old-${id}`),
    );
    expect(h.dispose).toHaveBeenCalledOnce();
  });

  it.each(['build', 'other-rollout'])(
    'does not activate or rollback automatically after %s failure',
    async (kind) => {
      const h = harness();
      if (kind === 'build') h.failBuild();
      else h.changeDuringBuild();
      await expect(
        deployApprovalProduction(env, { ...args, apply: true }, options(h)),
      ).rejects.toThrow();
      expect(h.functions.updateFunctionDeployment).not.toHaveBeenCalled();
      expect(h.dispose).toHaveBeenCalledOnce();
    },
  );

  it('plans an existing terms alignment without writing any variable or exposing values', async () => {
    const h = harness();
    h.variables.get('NUY_TERMS_VERSION')!.value = 'previous-public-policy';
    const result = await deployApprovalProduction(env, args, options(h));
    expect(result).toMatchObject({
      mode: 'plan',
      requiresTermsAlignment: true,
      minimumAgeMatchesApproved: true,
      changed: false,
    });
    expect(h.functions.updateVariable).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('previous-public-policy');
    expect(JSON.stringify(result)).not.toContain(EXPECTED_TERMS);
  });

  it('changes exactly the existing terms variable, preserves its secrecy and never touches age or other values', async () => {
    const h = harness();
    h.variables.get('NUY_TERMS_VERSION')!.value = 'previous-public-policy';
    h.variables.get('NUY_TERMS_VERSION')!.secret = true;
    const age = structuredClone(h.variables.get('NUY_MINIMUM_AGE'));
    const unrelated = structuredClone(h.variables.get('UNRELATED_SECRET'));
    await deployApprovalProduction(env, { ...args, apply: true }, options(h));
    expect(h.functions.updateVariable).toHaveBeenCalledExactlyOnceWith({
      functionId: 'complete-onboarding',
      variableId: 'terms-var',
      key: 'NUY_TERMS_VERSION',
      value: EXPECTED_TERMS,
      secret: true,
    });
    expect(h.variables.get('NUY_MINIMUM_AGE')).toEqual(age);
    expect(h.variables.get('UNRELATED_SECRET')).toEqual(unrelated);
    expect(h.events).toEqual([
      ...APPROVAL_PRODUCTION_FUNCTIONS.map((id) => `upload:${id}`),
      'align:complete-onboarding:NUY_TERMS_VERSION',
      ...APPROVAL_PRODUCTION_FUNCTIONS.map((id) => `activate:${id}`),
    ]);
  });

  it.each(['missing', 'wrong-scope', 'age-mismatch'])(
    'blocks policy %s before packaging or writes',
    async (kind) => {
      const h = harness();
      if (kind === 'missing') h.variables.delete('NUY_TERMS_VERSION');
      if (kind === 'wrong-scope') h.variables.get('NUY_TERMS_VERSION')!.resourceType = 'project';
      if (kind === 'age-mismatch') h.variables.get('NUY_MINIMUM_AGE')!.value = '19';
      await expect(
        deployApprovalProduction(env, { ...args, apply: true }, options(h)),
      ).rejects.toThrow();
      expect(h.packageCommit).not.toHaveBeenCalled();
      expect(h.functions.createDeployment).not.toHaveBeenCalled();
      expect(h.functions.updateVariable).not.toHaveBeenCalled();
    },
  );

  it.each(['changed', 'disappeared', 'head-changed'])(
    'does not overwrite policy or activate after %s during builds',
    async (kind) => {
      const h = harness();
      h.variables.get('NUY_TERMS_VERSION')!.value = 'previous-public-policy';
      if (kind === 'changed') h.mutatePolicyDuringBuild();
      if (kind === 'disappeared') h.dropTermsDuringBuild();
      const setup = options(h);
      if (kind === 'head-changed')
        setup.head = () => (h.events.some((e) => e.startsWith('upload:')) ? 'b'.repeat(40) : SHA);
      await expect(
        deployApprovalProduction(env, { ...args, apply: true }, setup),
      ).rejects.toThrow();
      expect(h.functions.updateVariable).not.toHaveBeenCalled();
      expect(h.functions.updateFunctionDeployment).not.toHaveBeenCalled();
    },
  );

  it('blocks activation if the reread does not confirm the committed terms version', async () => {
    const h = harness();
    h.variables.get('NUY_TERMS_VERSION')!.value = 'previous-public-policy';
    h.ignoreTermsUpdate();
    await expect(
      deployApprovalProduction(env, { ...args, apply: true }, options(h)),
    ).rejects.toThrow();
    expect(h.functions.updateVariable).toHaveBeenCalledOnce();
    expect(h.functions.updateFunctionDeployment).not.toHaveBeenCalled();
  });
});
