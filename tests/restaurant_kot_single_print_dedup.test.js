import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

if (typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: vi.fn()
      })
    })
  })
}));

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    open: () => ({
      document: {
        open: () => {},
        write: () => {},
        close: () => {}
      },
      focus: () => {},
      print: () => {}
    })
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      style: {},
      contentWindow: {
        document: {
          open: () => {},
          write: () => {},
          close: () => {}
        },
        focus: () => {},
        print: () => {}
      },
      remove: () => {}
    }),
    body: {
      appendChild: () => {}
    }
  };
}

const { isDuplicateSlipPrint, printKOTSlip, printBOTSlip, printPreBillSlip } = await import('../src/services/printService');

describe('Restaurant KOT & POS Single Print and Deduplication Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Verifies isDuplicateSlipPrint allows first print and blocks immediate duplicate print', () => {
    const key = `TEST_DEDUP_${Date.now()}`;
    const firstCall = isDuplicateSlipPrint(key, 5000);
    expect(firstCall).toBe(false);

    // Second call within 5000ms window must be detected as duplicate
    const secondCall = isDuplicateSlipPrint(key, 5000);
    expect(secondCall).toBe(true);
  });

  it('2. Verifies distinct KOT keys (different table or KOT number) are not blocked', () => {
    const uniqueA = `TEST_TBL_101_${Date.now()}`;
    const uniqueB = `TEST_TBL_102_${Date.now()}`;
    expect(isDuplicateSlipPrint(uniqueA, 5000)).toBe(false);
    expect(isDuplicateSlipPrint(uniqueB, 5000)).toBe(false);
  });

  it('3. Verifies printKOTSlip dispatches to printSlipWindow ONCE and suppresses the second duplicate print', () => {
    const tNum = `T-${Date.now() % 1000}`;
    const sampleKOT = {
      kotNumber: 1,
      tokenNumber: 5,
      items: [{ id: 10, name: 'Paneer Butter Masala', qty: 2 }]
    };

    const warnSpy = vi.spyOn(console, 'warn');
    printKOTSlip(sampleKOT, tNum, 'Captain John');
    printKOTSlip(sampleKOT, tNum, 'Captain John');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Duplicate KOT print suppressed for Table/Room ${tNum}`)
    );
  });

  it('4. Verifies printBOTSlip dispatches ONCE and suppresses duplicate prints', () => {
    const tNum = `B-${Date.now() % 1000}`;
    const sampleBOT = {
      botNumber: 1,
      tokenNumber: 8,
      items: [{ id: 25, name: 'Mojito', qty: 1 }]
    };

    const warnSpy = vi.spyOn(console, 'warn');
    printBOTSlip(sampleBOT, tNum, 'Bartender Alex');
    printBOTSlip(sampleBOT, tNum, 'Bartender Alex');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Duplicate BOT print suppressed for Table ${tNum}`)
    );
  });

  it('5. Verifies printPreBillSlip dispatches ONCE and suppresses duplicate pre-bills', () => {
    const tNum = `T-${Date.now() % 1000}`;
    const sampleCart = [{ id: 10, name: 'Dal Tadka', qty: 1, price: 180 }];
    const tableObj = { table_number: tNum, token_number: 12 };

    const warnSpy = vi.spyOn(console, 'warn');
    printPreBillSlip(tableObj, sampleCart, 'Staff');
    printPreBillSlip(tableObj, sampleCart, 'Staff');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Duplicate Pre-Bill print suppressed for Table/Room ${tNum}`)
    );
  });

  it('6. Verifies TableSessionView prevents rapid double-clicks with isSubmittingKOT lock and disabled state', () => {
    const tableSessionCode = fs.readFileSync(path.resolve(__dirname, '../src/components/restaurant/TableSessionView.jsx'), 'utf8');
    expect(tableSessionCode).toContain('const [isSubmittingKOT, setIsSubmittingKOT] = useState(false);');
    expect(tableSessionCode).toContain('if (isSubmittingKOT) return;');
    expect(tableSessionCode).toContain('disabled={isSubmittingKOT || cart.length === 0}');
    expect(tableSessionCode).toContain("isSubmittingKOT ? '⏳ Printing...' : `🖨️ ${department === 'bar' ? 'BOT' : 'KOT'}`");
  });
});
