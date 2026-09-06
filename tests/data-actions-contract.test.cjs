'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),sync=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-sync-durability-v1.js'),'utf8'),recovery=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-functional-recovery.js'),'utf8'),migration=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-data-migration-v2.js'),'utf8');
assert.equal(/document\.addEventListener\(['"]click['"]/.test(sync),false,'sync persistence must not install a global export click handler');
assert.ok(recovery.includes('exportButton.onclick=()=>window.GarangSyncDurabilityRuntime.exportVerifiedBackup()'));
assert.ok(recovery.includes('importButton.onclick=()=>window.GarangDataMigrationV2.importLegacy()'));
for(const token of ['GarangHistoryPersistence','RECOVERY_BACKUP_PREFIX','recoverySnapshots','guardedPersistHistory','location.reload()'])assert.ok(migration.includes(token),`recovery action contract missing ${token}`);
assert.equal(migration.includes('setInterval('),false);
console.log('data-actions-contract: PASS');
