import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const capacitor = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));

describe('LAST SIGNAL game branding', () => {
  it('keeps branding in the title, splash and menu while the compact HUD stays logo-free', () => {
    assert.match(html, /<title>LAST SIGNAL<\/title>/);
    assert.match(html, /class="startup-brand"[^>]*>LAST <span>SIGNAL<\/span>/);
    const header = html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1];
    assert.ok(header, 'the game header must exist');
    assert.doesNotMatch(header, /brand-name|LAST\s+SIGNAL/);
    assert.match(html, /id="menu-home-title"[^>]*>LAST SIGNAL<\/h2>/);
    assert.doesNotMatch(html, /UNDERGROUND\s+SURVIVE/i);
  });

  it('renames the native app without changing its installed package identity', () => {
    assert.equal(capacitor.appName, 'LAST SIGNAL');
    assert.equal(capacitor.appId, 'com.undergroundsurvive.game');
    assert.equal(capacitor.webDir, 'dist');
  });
});
