import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Accounting & Analysis: Expenses (Base), Company and GST Columns', () => {
  const printServicePath = path.resolve(__dirname, '../src/services/printService.js');
  const printServiceCode = fs.readFileSync(printServicePath, 'utf-8');

  const managePagePath = path.resolve(__dirname, '../src/pages/ManagePage.jsx');
  const managePageCode = fs.readFileSync(managePagePath, 'utf-8');

  it('1. Verifies exportAccountingAnalysisToExcel has Expenses (Base), Company and GST No columns', () => {
    // Header check includes Expenses (Base) and Company / GST columns
    expect(printServiceCode).toContain('<Data ss:Type="String">Expenses (Base)</Data>');
    expect(printServiceCode).toContain('<Data ss:Type="String">Other Discount</Data>');
    expect(printServiceCode).toContain('<Data ss:Type="String">Name Of Customer GST</Data>');
    expect(printServiceCode).toContain('<Data ss:Type="String">GST No of Customer</Data>');

    // Data row check
    expect(printServiceCode).toMatch(
      /<Cell ss:StyleID="DataCenter"><Data ss:Type="String">\$\{escapeHtml\(r\.gst_no_of_customer \|\| '-'\)\}/
    );
  });

  it('2. Verifies exportAccountingAnalysisToCsv has Expenses (Base), Company and GST No columns', () => {
    // CSV headers check
    expect(printServiceCode).toContain("'Expenses (Base)'");
    expect(printServiceCode).toContain("'Other Discount'");
    expect(printServiceCode).toContain("'Name Of Customer GST'");
    expect(printServiceCode).toContain("'GST No of Customer'");

    // CSV data row check
    expect(printServiceCode).toMatch(
      /escapeCsv\(r\.gst_no_of_company \|\| r\.gst_no_of_customer \|\| '-'\)/
    );
  });

  it('3. Verifies ManagePage Accounting table has Expenses (Base), Company and GST No columns', () => {
    expect(managePageCode).toContain('Expenses (Base)');
    expect(managePageCode).toContain('Other Discount');
    expect(managePageCode).toContain('Name Of Company');
    expect(managePageCode).toContain('GST No of Company');
  });
});
