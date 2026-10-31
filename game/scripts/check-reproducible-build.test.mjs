import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkLockfile } from './check-reproducible-build.mjs';

const pkg = { name:'demo',version:'1.0.0',dependencies:{ a:'1.0.0' },devDependencies:{ b:'^2.0.0' } };
const lock = { name:'demo',version:'1.0.0',lockfileVersion:3,packages:{'':{
  dependencies:{ a:'1.0.0' },devDependencies:{ b:'^2.0.0' }
}} };
describe('manual clean-build gate', () => {
  it('accepts only a committed matching npm lockfile', () => {
    assert.deepEqual(checkLockfile(pkg,lock), []);
    assert.ok(checkLockfile(pkg,null).length);
    assert.ok(checkLockfile({...pkg,dependencies:{a:'1.1.0'}},lock).length);
    assert.ok(checkLockfile({...pkg,version:'2.0.0'},lock).length);
  });
});
