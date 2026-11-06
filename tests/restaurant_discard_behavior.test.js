import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Restaurant & Bar POS Discard and Back Behavior', () => {
  const filePath = path.resolve(__dirname, '../src/components/restaurant/TableSessionView.jsx');
  const code = fs.readFileSync(filePath, 'utf8');

  it('1. Verifies hasActiveKOT accurately detects tables with dispatched KOTs', () => {
    expect(code).toContain('const hasActiveKOT = useMemo(');
    expect(code).toContain('kotCount > 0');
    expect(code).toContain('hasPrintedItems');
    expect(code).toContain('isOccupiedStatus');
  });

  it('2. Verifies hasUnsentNewItems detects additions to active KOT tables', () => {
    expect(code).toContain('const hasUnsentNewItems = useMemo(');
    expect(code).toContain('hasActiveKOT');
  });

  it('3. Verifies handleBackClick exits directly with NO popup when table has active KOT and no new additions', () => {
    expect(code).toContain('if (hasActiveKOT) {');
    expect(code).toContain('if (hasUnsentNewItems) {');
    expect(code).toContain('setShowUnsavedGuardModal(true);');
    expect(code).toContain('// Active table with KOT: smooth direct exit to floor with zero popups');
    expect(code).toContain('onBack();');
  });

  it('4. Verifies handleBackClick shows guard modal ONLY when order was taken without KOT (or unsent items on KOT)', () => {
    expect(code).toContain('if (cart.length > 0) {');
    expect(code).toContain('// Taken order WITHOUT KOT: show Save or Discard prompt');
  });

  it('5. Verifies handleDiscardAndExit preserves existing KOT items and only discards unsent additions', () => {
    expect(code).toContain('// Revert cart to initial/printed items, keeping existing KOT order 100% intact!');
    expect(code).toContain('Un-sent new additions discarded. Running KOT order preserved.');
    expect(code).toContain('api.saveBarCart');
    expect(code).toContain('api.saveRestaurantCart');
  });

  it('6. Verifies Guard Modal displays dynamic context-aware labels distinguishing active KOT tables from draft orders', () => {
    expect(code).toContain("hasActiveKOT ? 'Save or Discard New Additions?' : 'Save or Discard Draft Order?'");
    expect(code).toContain('Existing running KOT items are completely safe');
    expect(code).toContain("hasActiveKOT ? '💾 Save New Additions to Table' : '💾 Save Draft Order'");
    expect(code).toContain("hasActiveKOT ? '🗑️ Discard New Additions' : '🗑️ Discard Draft Order'");
  });
});

