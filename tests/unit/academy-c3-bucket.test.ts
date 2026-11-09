import { expect, it } from 'vitest';
import { c31EmptyBucketBlockers, c3UploadBlockers,
  c3BucketProposal } from '../../infra/appwrite/c3-bucket-provision';

const ready = {
  endpoint: 'https://api.edocs.phiq.com.br/v1',
  projectId: '6ad55be5003719f6b399',
  projectName: 'NUY Creators — Academia Staging',
  version: '2.2.0',
  globalLimitBytes: 209_715_200,
  proxyLimitBytes: 209_715_200,
  freeBytes: 419_430_400,
  backupRestoreVerified: true,
  scannerCoversFullFile: true,
  explicitBucketApproval: true,
};

it('plans only one private staging bucket with no broad ACL', () => {
  expect(c3BucketProposal.projectId).toBe(ready.projectId);
  expect(c3BucketProposal.request).toMatchObject({
    bucketId: 'academy-media', permissions: [], fileSecurity: true,
    enabled: false, maximumFileSize: 1, allowedFileExtensions: ['mp4', 'pdf'],
    compression: 'none', encryption: false, antivirus: false,
  });
});

it('blocks empty-bucket apply without a dedicated key and exact staging identity', () => {
  const gate = { endpoint: ready.endpoint, projectId: ready.projectId,
    projectName: ready.projectName, version: ready.version,
    dedicatedBucketCredential: true, explicitEmptyBucketApproval: true };
  expect(c31EmptyBucketBlockers(gate)).toEqual([]);
  expect(c31EmptyBucketBlockers({ ...gate, dedicatedBucketCredential: false }))
    .toContain('bucket_credential_missing');
  expect(c31EmptyBucketBlockers({ ...gate, projectId: '6ac044af0008cbdda070' }))
    .toContain('staging_identity_unverified');
});

it('separately blocks future uploads until host and scanner are verified', () => {
  expect(c3UploadBlockers(ready)).toEqual([]);
  const blocked = c3UploadBlockers({ ...ready, globalLimitBytes: null,
    proxyLimitBytes: null, freeBytes: null, backupRestoreVerified: false,
    scannerCoversFullFile: false, explicitBucketApproval: false });
  expect(blocked).toEqual([
    'global_limit_unverified', 'proxy_limit_unverified', 'capacity_unverified',
    'backup_restore_unverified', 'full_file_scan_unverified', 'bucket_approval_missing',
  ]);
});
