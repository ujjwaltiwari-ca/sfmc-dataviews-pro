import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VISIT_COUNT_STORAGE_KEY,
  WHATS_NEW_STORAGE_KEY,
  WHATS_NEW_VERSION,
  hasSeenWhatsNew,
  recordAppVisit,
  shouldAutoOpenWhatsNew,
} from './changelog';

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('changelog visit prompts', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  it('does not auto-open on the first visit', () => {
    recordAppVisit();
    expect(shouldAutoOpenWhatsNew()).toBe(false);
  });

  it('auto-opens from the second visit when release notes are unseen', () => {
    recordAppVisit();
    recordAppVisit();
    expect(shouldAutoOpenWhatsNew()).toBe(true);
  });

  it('does not auto-open after release notes are marked seen', () => {
    recordAppVisit();
    recordAppVisit();
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION);
    expect(hasSeenWhatsNew()).toBe(true);
    expect(shouldAutoOpenWhatsNew()).toBe(false);
  });

  it('increments the visit counter', () => {
    expect(recordAppVisit()).toBe(1);
    expect(recordAppVisit()).toBe(2);
    expect(localStorage.getItem(VISIT_COUNT_STORAGE_KEY)).toBe('2');
  });
});
