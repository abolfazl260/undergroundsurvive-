import { describe, expect, it } from 'vitest';
import { HELP_TOPICS, HELP_TOPIC_IDS } from '../../content/helpTopics';
import { ROOM_DEFINITIONS } from '../../modules/building/catalog';
import { BUILD_COSTS } from '../../modules/economy/pricing';
import { findHelpTopics, ROOM_GUIDE } from './gameHelp';

describe('in-game bilingual help', () => {
  it('has 15 complete topics with unique stable ids and both languages', () => {
    expect(HELP_TOPICS).toHaveLength(15);
    expect(new Set(HELP_TOPIC_IDS).size).toBe(HELP_TOPICS.length);
    for (const topic of HELP_TOPICS) {
      expect(topic.fa.title.trim().length).toBeGreaterThan(2);
      expect(topic.en.title.trim().length).toBeGreaterThan(2);
      expect(topic.fa.intro.trim().length).toBeGreaterThan(15);
      expect(topic.en.intro.trim().length).toBeGreaterThan(15);
      expect(topic.fa.steps.length).toBeGreaterThanOrEqual(4);
      expect(topic.en.steps.length).toBeGreaterThanOrEqual(4);
      expect(topic.fa.steps.every((step) => step.trim().length > 15)).toBe(true);
      expect(topic.en.steps.every((step) => step.trim().length > 15)).toBe(true);
    }
  });

  it('finds Persian topics and room names even with Arabic keyboard variants', () => {
    expect(findHelpTopics('آسانسور', 'fa').map((topic) => topic.id)).toContain('elevator');
    expect(findHelpTopics('نيروگاه', 'fa').map((topic) => topic.id)).toContain('rooms');
    expect(findHelpTopics('   سکه  ', 'fa').length).toBeGreaterThan(1);
  });

  it('supports English content and reports no results for unknown terms', () => {
    expect(findHelpTopics('generator', 'en').map((topic) => topic.id)).toContain('rooms');
    expect(findHelpTopics('elevator', 'en').map((topic) => topic.id)).toContain('elevator');
    expect(findHelpTopics('no-matches-here-927471', 'en')).toEqual([]);
    expect(findHelpTopics('  ', 'en')).toHaveLength(HELP_TOPICS.length);
  });

  it('uses the complete live buildable room catalog and its actual costs', () => {
    expect(Object.keys(ROOM_GUIDE).sort()).toEqual(Object.keys(ROOM_DEFINITIONS).sort());
    expect(Object.keys(BUILD_COSTS).sort()).toEqual(Object.keys(ROOM_DEFINITIONS).sort());
    for (const room of Object.values(ROOM_GUIDE)) {
      expect(room.fa.length).toBeGreaterThan(2);
      expect(room.en.length).toBeGreaterThan(2);
      expect(room.purposeFa.length).toBeGreaterThan(15);
      expect(room.purposeEn.length).toBeGreaterThan(15);
    }
  });
});
