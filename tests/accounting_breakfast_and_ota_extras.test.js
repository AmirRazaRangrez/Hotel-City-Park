import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: vi.fn()
      })
    })
  })
}));

import { generateAccountingAnalysisExcelXml, buildAccountingAnalysisPrintHTML } from '../src/services/printService.js';

describe('Accounting & Analysis: Breakfast Plan, OTA Extra Breakfast & Visitor Breakfast', () => {
  const serverPath = path.resolve(__dirname, '../server.js');
  const serverCode = fs.readFileSync(serverPath, 'utf-8');

  const releaseServerPath = path.resolve(__dirname, '../release/server.js');
  const releaseServerCode = fs.readFileSync(releaseServerPath, 'utf-8');

  const managePagePath = path.resolve(__dirname, '../src/pages/ManagePage.jsx');
  const managePageCode = fs.readFileSync(managePagePath, 'utf-8');

  const printServicePath = path.resolve(__dirname, '../src/services/printService.js');
  const printServiceCode = fs.readFileSync(printServicePath, 'utf-8');

  it('1. Verifies server.js & release/server.js extract meal plan, extra breakfast charge and compute breakfast bases', () => {
    for (const code of [serverCode, releaseServerCode]) {
      // Query fields
      expect(code).toContain('b.meal_plan');
      expect(code).toContain('b.extra_breakfast_charge');
      expect(code).toContain('r.breakfast_price');

      // Calculations
      expect(code).toContain('plan_breakfast_base');
      expect(code).toContain('ota_extra_breakfast_base');
      expect(code).toContain('total_breakfast_base');
      expect(code).toContain('total_plan_breakfast');
      expect(code).toContain('total_ota_extra_breakfast');
    }
  });

  it('2. Verifies ManagePage.jsx renders Breakfast KPI card and itemized table columns', () => {
    // KPI Card
    expect(managePageCode).toContain('Total Breakfast (Base)');
    expect(managePageCode).toContain('total_plan_breakfast');
    expect(managePageCode).toContain('total_ota_extra_breakfast');

    // Table Header
    expect(managePageCode).toContain('Breakfast Plan (Base)');
    expect(managePageCode).toContain('OTA Extra Breakfast (Base)');
    expect(managePageCode).toContain('Visitors Breakfast (Base)');

    // Table Cells
    expect(managePageCode).toContain('r.plan_breakfast_base');
    expect(managePageCode).toContain('r.ota_extra_breakfast_base');
    expect(managePageCode).toContain('r.visitor_breakfast_base');
  });

  it('3. Verifies printService.js exports Breakfast Plan and OTA Extra Breakfast in Excel XML, CSV, and Print HTML', () => {
    // Excel XML
    expect(printServiceCode).toContain('<Data ss:Type="String">Breakfast Plan (Base)</Data>');
    expect(printServiceCode).toContain('<Data ss:Type="String">OTA Extra Breakfast (Base)</Data>');
    expect(printServiceCode).toContain('<Data ss:Type="String">Visitors Breakfast (Base)</Data>');
    expect(printServiceCode).toContain('r.plan_breakfast_base');
    expect(printServiceCode).toContain('r.ota_extra_breakfast_base');
    expect(printServiceCode).toContain('summary.total_plan_breakfast');
    expect(printServiceCode).toContain('summary.total_ota_extra_breakfast');

    // CSV
    expect(printServiceCode).toContain("'Breakfast Plan (Base)'");
    expect(printServiceCode).toContain("'OTA Extra Breakfast (Base)'");
    expect(printServiceCode).toContain("'Visitors Breakfast (Base)'");

    // Print HTML
    expect(printServiceCode).toContain('totPlanBreakfast');
    expect(printServiceCode).toContain('totOtaExtraBreakfast');
    expect(printServiceCode).toContain('totVisitorBreakfast');
  });

  it('4. Functionally generates Excel XML and verifies breakfast data columns and summary values', () => {
    const mockRecords = [
      {
        date_of_checkout: '12-11-2026',
        bill_no: 'B101',
        invoice_number: 'INV-101',
        name_of_customer: 'Test Guest 1',
        room_rent_base: 2000,
        extra_mattress_pax: 500,
        plan_breakfast_base: 380.95,
        ota_extra_breakfast_base: 238.10,
        visitor_breakfast_base: 0,
        extra_expenses_base: 0,
        discount: 0,
        other_discount: 0,
        cgst: 155.95,
        sgst: 155.95,
        igst: 0,
        name_of_company: 'OTA Direct',
        gst_no_of_customer: '27AAAAA0000A1Z5'
      }
    ];

    const mockSummary = {
      total_room_rent_base: 2000,
      total_extra_mattress: 500,
      total_plan_breakfast: 380.95,
      total_ota_extra_breakfast: 238.10,
      total_visitor_breakfast: 0,
      total_extra_expenses: 0,
      total_discount: 0,
      total_other_discount: 0,
      total_cgst: 155.95,
      total_sgst: 155.95,
      total_igst: 0,
      total_grand: 3430.95
    };

    const xml = generateAccountingAnalysisExcelXml(mockRecords, mockSummary, {});
    expect(xml).toContain('<Data ss:Type="String">Breakfast Plan (Base)</Data>');
    expect(xml).toContain('<Data ss:Type="String">OTA Extra Breakfast (Base)</Data>');
    expect(xml).toContain('<Data ss:Type="Number">380.95</Data>');
    expect(xml).toContain('<Data ss:Type="Number">238.10</Data>');

    const html = buildAccountingAnalysisPrintHTML({ records: mockRecords, summary: mockSummary, filters: {} });
    expect(html).toContain('Breakfast Plan (Base)');
    expect(html).toContain('OTA Extra Breakfast (Base)');
    expect(html).toContain('₹380.95');
    expect(html).toContain('₹238.10');
  });
});
