import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const capacitor = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));

describe('LAST SIGNAL game branding', () => {
  it('uses the new name in the browser title, loading screen, HUD and game menu', () => {
    assert.match(html, /<title>LAST SIGNAL<\/title>/);
    assert.match(html, /class="startup-brand"[^>]*>LAST <span>SIGNAL<\/span>/);
    assert.match(html, /class="brand-name"[^>]*>LAST <span>SIGNAL<\/span>/);
    assert.match(html, /id="menu-home-title"[^>]*>LAST SIGNAL<\/h2>/);
    assert.doesNotMatch(html, /UNDERGROUND\s+SURVIVE/i);
  });

  it('renames the native app without changing its installed package identity', () => {
    assert.equal(capacitor.appName, 'LAST SIGNAL');
    assert.equal(capacitor.appId, 'com.undergroundsurvive.game');
    assert.equal(capacitor.webDir, 'dist');
  });
});
