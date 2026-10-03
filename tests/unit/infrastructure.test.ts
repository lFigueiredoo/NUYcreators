import { describe, expect, it } from 'vitest';
import { collections, levelSeed, team, functionDefinitions } from '../../infra/appwrite/schema';
describe('infrastructure manifest', () => {
  it('has distinct collections and fields', () => {
    expect(new Set(collections.map((c) => c.id)).size).toBe(collections.length);
    for (const c of collections)
      expect(new Set(c.attributes.map((a) => a.key)).size).toBe(c.attributes.length);
  });
  it('has consistent index references', () => {
    for (const c of collections)
      for (const group of [...c.unique, ...c.indexes])
        for (const key of group)
          expect([...c.attributes.map((a) => a.key), '$createdAt']).toContain(key);
  });
  it('has contiguous backend level configuration', () => {
    for (let i = 1; i < levelSeed.length; i++)
      expect(levelSeed[i].minPoints).toBe(levelSeed[i - 1].maxPoints! + 1);
    expect(levelSeed.at(-1)?.maxPoints).toBeNull();
  });
  it('does not pretend critical commands are implemented', () => {
    expect(functionDefinitions.find((f) => f.id === 'redeem-reward')?.implemented).toBe(false);
  });
  it('defines separated team roles', () => {
    expect(team.roles).toEqual(['admin', 'moderator', 'fulfillment']);
  });
});
