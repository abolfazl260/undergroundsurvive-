import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE, LANGUAGE_STORAGE_KEY, formatNumber, getLocale, loadLocale,
  localizeGameMessage, normalizeLocale, setLocale, subscribeLocaleChange, t
} from './index';

beforeEach(() => { setLocale('fa', { setItem: () => {} }); });

describe('language preferences', () => {
  it('preserves Persian as a safe default and rejects unsupported codes', () => {
    expect(DEFAULT_LOCALE).toBe('fa');
    expect(normalizeLocale('fr')).toBe('fa');
    expect(normalizeLocale({ locale: 'en' })).toBe('fa');
    expect(loadLocale({ getItem: () => 'invalid' })).toBe('fa');
    expect(loadLocale({ getItem: () => { throw new Error('blocked'); } })).toBe('fa');
  });

  it('stores its language key separately from game and menu saves', () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value); }
    };
    setLocale('en', storage);
    expect(getLocale()).toBe('en');
    expect(loadLocale(storage)).toBe('en');
    expect([...saved.keys()]).toEqual([LANGUAGE_STORAGE_KEY]);
    expect(setLocale('invalid', storage)).toBe('fa');
    expect(loadLocale(storage)).toBe('fa');
  });

  it('formats numbers and interpolates translated strings without losing parameters', () => {
    expect(t('هزینهٔ سطح بعد: {value} سکه', { value: formatNumber(1500) })).toContain('۱');
    setLocale('en', { setItem: () => {} });
    expect(t('هزینهٔ سطح بعد: {value} سکه', { value: formatNumber(1500) }))
      .toBe('Next level cost: 1,500 coins');
    expect(t('an-untranslated-key')).toBe('an-untranslated-key');
    expect(localizeGameMessage('این اتاق قابل جابه‌جایی نیست.')).toBe('This room cannot be moved.');
    expect(localizeGameMessage('اتاق ساخته شد. هزینه: 200 سکه.')).toBe('Room built. Cost: 200 coins.');
  });

  it('translates cinematic pause-menu actions and accessible labels', () => {
    expect(t('بازگشت به پناهگاه')).toBe('بازگشت به پناهگاه');
    setLocale('en', { setItem: () => {} });
    expect(t('ورود به پناهگاه')).toBe('Enter the shelter');
    expect(t('بازگشت به پناهگاه')).toBe('Return to the shelter');
    expect(t('ساخت یک پناهگاه تازه')).toBe('Create a fresh shelter');
    expect(t('صدا، زبان و حرکت')).toBe('Audio, language and motion');
    expect(t('بازگشت به صفحهٔ شروع')).toBe('Back to the start screen');
    expect(t('ذخیرهٔ محلی روی این دستگاه')).toBe('Local save on this device');
    expect(t('بستن منوی توقف و ادامهٔ بازی')).toBe('Close pause menu and resume');
  });

  it('notifies subscribers only for an actual change', () => {
    let calls = 0;
    const unsubscribe = subscribeLocaleChange(() => { calls++; });
    setLocale('en', { setItem: () => {} });
    setLocale('en', { setItem: () => {} });
    expect(calls).toBe(1);
    unsubscribe();
    setLocale('fa', { setItem: () => {} });
    expect(calls).toBe(1);
  });
});
