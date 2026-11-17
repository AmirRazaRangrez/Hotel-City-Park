import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('BTC Accounting Calculation, Excel Filtering & Analytics Line Graph', () => {
  const serverPath = path.resolve(__dirname, '../server.js');
  const releaseServerPath = path.resolve(__dirname, '../release/server.js');
  const serverCode = fs.readFileSync(serverPath, 'utf-8');
  const releaseServerCode = fs.readFileSync(releaseServerPath, 'utf-8');

  const printServicePath = path.resolve(__dirname, '../src/services/printService.js');
  const printServiceCode = fs.readFileSync(printServicePath, 'utf-8');

  const managePagePath = path.resolve(__dirname, '../src/pages/ManagePage.jsx');
  const managePageCode = fs.readFileSync(managePagePath, 'utf-8');

  const bookingGraphPath = path.resolve(__dirname, '../src/components/manager/BookingAnalysisGraph.jsx');
  const bookingGraphCode = fs.readFileSync(bookingGraphPath, 'utf-8');

  it('1. Verifies server.js & release/server.js classify BTC payment status and exclude unpaid BTC from summary calculations', () => {
    [serverCode, releaseServerCode].forEach(code => {
      expect(code).toContain('item.is_unpaid_btc = isUnpaid;');
      expect(code).toContain('item.is_partially_paid_btc = isPartiallyPaid;');
      expect(code).toContain('item.is_fully_paid_btc = isFullyPaid;');
      expect(code).toContain('item.btc_payment_status = isFullyPaid ?');

      // Summary accumulator checks
      expect(code).toContain('if (it.is_unpaid_btc) {');
      expect(code).toContain('If unpaid BTC, DO NOT ADD to calculation totals');
      expect(code).toContain('const ratio = it.is_partially_paid_btc ?');
    });
  });

  it('2. Verifies printService.js filters out unpaid BTC from Excel XML and CSV exports', () => {
    // Excel export excludes unpaid BTC
    expect(printServiceCode).toMatch(
      /exportRecords\s*=\s*records\.filter\(r\s*=>\s*!r\.is_unpaid_btc/
    );

    // CSV export excludes unpaid BTC
    expect(printServiceCode).toContain('const exportRecords = records.filter(r => !r.is_unpaid_btc');

    // Print HTML styles unpaid BTC in red with badge
    expect(printServiceCode).toContain('[BTC UNPAID]');
    expect(printServiceCode).toContain('#dc2626');
  });

  it('3. Verifies ManagePage.jsx renders unpaid BTC in red and provides Bill/Inv filter & Day/Week/Month/Year presets', () => {
    // Unpaid BTC red styling in accounting table
    expect(managePageCode).toContain('is_unpaid_btc');
    expect(managePageCode).toContain('BTC UNPAID (₹0 Paid)');
    expect(managePageCode).toContain('#dc2626');

    // Financial Analytics toolbar Bill/Inv inputs
    expect(managePageCode).toContain('analyticsFromBillNo');
    expect(managePageCode).toContain('analyticsToBillNo');
    expect(managePageCode).toContain('Bill / Inv:');

    // Financial Analytics Presets
    expect(managePageCode).toMatch(/Day\s*<\/button>/);
    expect(managePageCode).toMatch(/Week\s*<\/button>/);
    expect(managePageCode).toMatch(/Month\s*<\/button>/);
    expect(managePageCode).toMatch(/Year\s*<\/button>/);
  });

  it('4. Verifies BookingAnalysisGraph.jsx features Bill/Inv filter, Day/Week/Month/Year presets, and Line Chart SVG', () => {
    // Presets
    expect(bookingGraphCode).toContain("handlePreset('day')");
    expect(bookingGraphCode).toContain("handlePreset('week')");
    expect(bookingGraphCode).toContain("handlePreset('month')");
    expect(bookingGraphCode).toContain("handlePreset('year')");

    // Bill / Invoice filter inputs
    expect(bookingGraphCode).toContain('fromBillNo');
    expect(bookingGraphCode).toContain('toBillNo');
    expect(bookingGraphCode).toContain('Bill/Inv:');

    // SVG Line chart path
    expect(bookingGraphCode).toContain('d={linePath}');
    expect(bookingGraphCode).toContain('stroke="#06b6d4"');
    expect(bookingGraphCode).toContain('strokeWidth="3.5"');

    // Circular node markers matching reference image
    expect(bookingGraphCode).toContain('fill="#ffffff"');
    expect(bookingGraphCode).toContain("stroke={isHovered ? '#0891b2' : '#06b6d4'}");
    expect(bookingGraphCode).toContain('strokeWidth={isHovered ? 4 : 3.5}');

    // Orthogonal gridlines (horizontal and vertical)
    expect(bookingGraphCode).toContain('key={`h-grid-${idx}`}');
    expect(bookingGraphCode).toContain('key={`v-grid-${idx}`}');

    // Hover tooltip
    expect(bookingGraphCode).toContain('hoveredPoint');
  });
});
