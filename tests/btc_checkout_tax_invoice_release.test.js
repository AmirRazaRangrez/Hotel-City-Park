import { describe, it, expect, vi } from 'vitest';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: vi.fn()
      })
    })
  })
}));

import fs from 'fs';
import path from 'path';
import { buildFinalBillA4HTML } from '../src/services/printService';

describe('BTC Checkout Tax Invoice Release Test Suite', () => {
  it('1. Verifies FolioSettlementModal releases printFinalBillA4 on checkout for BTC', () => {
    const modalPath = path.resolve(__dirname, '../src/components/hospitality/FolioSettlementModal.jsx');
    const modalCode = fs.readFileSync(modalPath, 'utf8');

    // Checkout execution must call printFinalBillA4
    expect(modalCode).toContain('printFinalBillA4(room, folioData, settlementData');

    // Must NOT gate printFinalBillA4 inside an else block of isCompanyPayingLater
    const checkoutSuccessIdx = modalCode.indexOf('const res = await api.checkout');
    const executeSlice = modalCode.slice(checkoutSuccessIdx, checkoutSuccessIdx + 10000);
    expect(executeSlice).toContain('// Release official Tax Invoice and receipts for all checkouts (including BTC)');
    expect(executeSlice).toContain('printFinalBillA4(room, folioData, settlementData, {');

    // SettlementData must fall back to corporate BTC details
    expect(modalCode).toContain('room.btc_company_name || folioData.btcCompanyName');
    expect(modalCode).toContain('room.btc_gst_number || folioData.btcCompanyGst');

    // Footer must have Print Tax Invoice button available
    expect(modalCode).toContain('title="Preview or print official colorful A4 Tax Invoice with background logo"');
    expect(modalCode).toContain('🧾 Print Tax Invoice (A4)');
  });

  it('2. Verifies HospitalityHistory unlocks Tax Invoice for pending BTC bookings', () => {
    const historyPath = path.resolve(__dirname, '../src/components/hospitality/HospitalityHistory.jsx');
    const historyCode = fs.readFileSync(historyPath, 'utf8');

    // Must NOT contain locked Tax Invoice button
    expect(historyCode).not.toContain('🔒 Tax Invoice (Pending Company Payment)');
    expect(historyCode).not.toContain('⚠️ Payment is pending from company. Settle BTC payment first to release official Tax Invoice.');

    // Must contain active Tax Invoice button
    expect(historyCode).toContain('🧾 Tax Invoice');
  });

  it('3. Verifies buildFinalBillA4HTML generates accurate Tax Invoice for BTC bookings', () => {
    const btcRoom = {
      room_number: '403',
      guest_name: 'BTC Guest',
      booking_source: 'BTC',
      btc_company_name: 'INFOSYS BPM TECHNOLOGIES',
      btc_gst_number: '27AABCI1234F1Z5',
      btc_address: 'HINJEWADI PHASE 2, PUNE',
      room_rate: 2350,
      base_rate: 2350,
      price: 2350,
      total_room_charge: 2350,
      extra_bed_charge: 600,
      extra_beds: 1,
      adults_male: 3,
      adults_female: 0,
      meal_plan: 'with_breakfast',
      breakfast_price: 250,
      voucher_number: '261111-721',
      invoice_number: 'HCP721',
      stay_nights: 1
    };

    const btcCalc = {
      baseRoomTariff: 2350,
      baseRoomTariffTotal: 2350,
      extraBedCharge: 600,
      breakfastPlanTotal: 750,
      breakfastPlanPax: 3,
      totalDiscountAmt: 0,
      roomBillTotal: 3885,
      invoiceTotal: 3885,
      netPayable: 3885
    };

    const settlementData = {
      settleAmt: 0,
      targetNetPayable: 3885,
      balanceDue: 3885,
      isCheckoutSettlement: true,
      company_name: 'INFOSYS BPM TECHNOLOGIES',
      gst_number: '27AABCI1234F1Z5',
      company_address: 'HINJEWADI PHASE 2, PUNE'
    };

    const html = buildFinalBillA4HTML(btcRoom, btcCalc, settlementData);

    // Verify company & GSTIN on Tax Invoice
    expect(html).toContain('INFOSYS BPM TECHNOLOGIES');
    expect(html).toContain('27AABCI1234F1Z5');
    expect(html).toContain('HINJEWADI PHASE 2, PUNE');
    expect(html).toContain('Booking Mode :');
    expect(html).toContain('>BTC<');

    // Verify accommodation items
    expect(html).toContain('Room Tariff -');
    expect(html).toContain('2350.00');
    expect(html).toContain('Extra Mattress Base Tariff');
    expect(html).toContain('600.00');
    expect(html).toContain('Breakfast Plan Included (3 Pax)');
    expect(html).toContain('750.00');
    expect(html).toContain('Effective Tariff');
    expect(html).toContain('3700.00');
    expect(html).toContain('CGST @ 2.5%');
    expect(html).toContain('92.50');
    expect(html).toContain('SGST @ 2.5%');
    expect(html).toContain('92.50');
    expect(html).toContain('Room Bill Total');
    expect(html).toContain('3885.00');
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('3885.00');
  });
});
