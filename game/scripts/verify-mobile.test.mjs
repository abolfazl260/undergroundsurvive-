import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { configurationProblems } from './verify-mobile.mjs';

const pkg = {
  dependencies: { '@capacitor/core': '8.5.3', '@capacitor/android': '8.5.3', '@capacitor/ios': '8.5.3' },
  devDependencies: { '@capacitor/cli': '8.5.3' }
};
const config = { appId: 'com.undergroundsurvive.game', appName: 'Underground Survive', webDir: 'dist' };

describe('Capacitor configuration', () => {
  it('accepts the offline app config and pinned compatible platform versions', () => {
    assert.deepEqual(configurationProblems(config, pkg), []);
  });
  it('rejects remote development servers and cleartext in production', () => {
    const errors = configurationProblems({ ...config, server: { url: 'http://localhost:5173', cleartext: true } }, pkg);
    assert.ok(errors.some((error) => error.includes('remote server')));
  });
  it('rejects incorrect web directories and invalid application identifiers', () => {
    const errors = configurationProblems({ ...config, webDir: 'public', appId: 'bad-id' }, pkg);
    assert.ok(errors.some((error) => error.includes('webDir')));
    assert.ok(errors.some((error) => error.includes('appId')));
  });
  it('requires Capacitor majors and patch versions to remain aligned', () => {
    const changed = structuredClone(pkg);
    changed.dependencies['@capacitor/ios'] = '7.6.10';
    assert.ok(configurationProblems(config, changed).some((error) => error.includes('same pinned')));
  });
  it('refuses accidental mixed-content permissions', () => {
    assert.ok(configurationProblems({ ...config, android: { allowMixedContent: true } }, pkg)
      .some((error) => error.includes('Mixed content')));
  });
});
