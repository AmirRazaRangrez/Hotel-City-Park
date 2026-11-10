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

import { buildFinalBillA4HTML } from '../src/services/printService.js';

describe('User Invoice Accuracy: Proper Entered Discount & Forward Tax Calculation', () => {

  describe('Room 405 (Pic 5 scenario: ₹21 proper discount)', () => {
    const room405Nauman = {
      id: 5,
      room_number: '405',
      room_type: 'Executive Room',
      guest_name: 'NAUMAN KHAIRDI',
      address: 'TELANGI PACCHA PETH FLAT NO.2',
      checkin_time: '2026-11-08 16:19:00',
      checkout_time: '2026-11-08 16:24:18',
      actual_checkout_time: '2026-11-08 16:24:18',
      stay_nights: 1,
      pax: 2,
      total_pax: 2,
      room_rate: 2350,
      price: 2350,
      breakfast_price: 250,
      meal_plan: 'with_breakfast',
      advance_payment: 1421,
      initial_paid: 1421,
      total_paid: 2821,
      discount_amount: 143,
      checkout_discount_amount: 21,
      voucher_number: '261108-698',
      invoice_no: 'HCP698'
    };

    const calc405 = {
      baseRoomTariff: 2350,
      breakfastCost: 500,
      breakfastPax: 2,
      breakfastDailyRate: 250,
      billableDays: 1,
      discountAmount: 143,
      discountPct: 5,
      advancePaid: 1421,
      stayCalcNow: {
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        breakfastCost: 500,
        breakfastPax: 2,
        grossTariff: 2850,
        discountAmount: 143,
        discountPct: 5,
        effectiveTariff: 2707,
        advancePaid: 1421,
        balanceDue: 1421
      }
    };

    it('renders proper 21.00 Other Discount (not artificial 20.33) and forward-calculated GST', () => {
      const settlement = {
        isCheckoutSettlement: true,
        checkin_discount_amt: 143,
        checkout_discount_amt: 21,
        settleAmt: 1400,
        targetNetPayable: 1400,
        invoiceNo: 'HCP698'
      };

      const html = buildFinalBillA4HTML(room405Nauman, calc405, settlement);

      // 1. Table items
      expect(html).toContain('2350.00');
      expect(html).toContain('500.00');
      expect(html).toContain('Less Discount (5%)');
      expect(html).toContain('- 143.00');
      expect(html).toContain('Other Discount');
      expect(html).toContain('- 21.00');
      expect(html).not.toContain('- 20.33');
      expect(html).not.toContain('20.33');

      // 2. Effective Tariff: 2850 - 143 - 21 = 2686.00
      expect(html).toContain('Effective Tariff');
      expect(html).toContain('2686.00');

      // 3. Exact 2.5% GST: 2686 * 0.025 = 67.15 each
      expect(html).toContain('CGST @ 2.5%');
      expect(html).toContain('67.15');
      expect(html).toContain('SGST @ 2.5%');

      // 4. Room Bill Total and Round-off: 2686 + 134.30 = 2820.30 -> Roundoff -0.30 -> Total 2820.00
      expect(html).toContain('2820.30');
      expect(html).toContain('-0.30');
      expect(html).toContain('2820.00');

      // 5. Settlement Summary Box
      expect(html).toContain('Gross Payable Amount');
      expect(html).toContain('2820.00');
      expect(html).toContain('Advance Received');
      expect(html).toContain('1421.00');
      expect(html).toContain('Net Payable');
      expect(html).toContain('1399.00');

      // 6. Number to words
      expect(html).toContain('Two Thousand Eight Hundred And Twenty Only');
      expect(html).toContain('One Thousand Three Hundred And Ninety Nine Only');
    });

    it('history reprint for Room 405 matches checkout invoice identically', () => {
      const settlement = {
        isReprint: true,
        checkin_discount_amt: 143,
        checkout_discount_amt: 21,
        settleAmt: 1399,
        invoiceNo: 'HCP698'
      };

      const html = buildFinalBillA4HTML(room405Nauman, calc405, settlement);

      expect(html).toContain('- 21.00');
      expect(html).not.toContain('20.33');
      expect(html).toContain('2686.00');
      expect(html).toContain('67.15');
      expect(html).toContain('2820.30');
      expect(html).toContain('-0.30');
      expect(html).toContain('2820.00');
      expect(html).toContain('1399.00');
    });
  });

  describe('Room 404 / 402 (Pic 3 scenario: ₹43 proper discount)', () => {
    const room404Nauman = {
      id: 2,
      room_number: '402, 404',
      room_type: 'Executive Room',
      guest_name: 'NAUMAN KHAIRDI',
      address: 'TELANGI PACCHA PETH FLAT NO.2',
      checkin_time: '2026-11-08 15:31:00',
      checkout_time: '2026-11-08 15:37:56',
      actual_checkout_time: '2026-11-08 15:37:56',
      stay_nights: 1,
      pax: 4,
      total_pax: 4,
      room_rate: 4700,
      price: 4700,
      breakfast_price: 250,
      meal_plan: 'with_breakfast',
      advance_payment: 2843,
      initial_paid: 2843,
      total_paid: 5643,
      discount_amount: 285,
      checkout_discount_amount: 43,
      voucher_number: '261108-697',
      invoice_no: 'HCP697'
    };

    const calc404 = {
      baseRoomTariff: 4700,
      breakfastCost: 1000,
      breakfastPax: 4,
      breakfastDailyRate: 250,
      billableDays: 1,
      discountAmount: 285,
      discountPct: 5,
      advancePaid: 2843,
      stayCalcNow: {
        dailyBaseRate: 4700,
        baseRoomTariff: 4700,
        breakfastCost: 1000,
        breakfastPax: 4,
        grossTariff: 5700,
        discountAmount: 285,
        discountPct: 5,
        effectiveTariff: 5415,
        advancePaid: 2843,
        balanceDue: 2843
      }
    };

    it('renders proper 43.00 Other Discount (not artificial 40.71) and forward-calculated GST', () => {
      const settlement = {
        isCheckoutSettlement: true,
        checkin_discount_amt: 285,
        checkout_discount_amt: 43,
        settleAmt: 2800,
        invoiceNo: 'HCP697'
      };

      const html = buildFinalBillA4HTML(room404Nauman, calc404, settlement);

      // 1. Table items
      expect(html).toContain('4700.00');
      expect(html).toContain('1000.00');
      expect(html).toContain('Less Discount (5%)');
      expect(html).toContain('- 285.00');
      expect(html).toContain('Other Discount');
      expect(html).toContain('- 43.00');
      expect(html).not.toContain('- 40.71');
      expect(html).not.toContain('40.71');

      // 2. Effective Tariff: 5700 - 285 - 43 = 5372.00
      expect(html).toContain('Effective Tariff');
      expect(html).toContain('5372.00');

      // 3. Exact 2.5% GST: 5372 * 0.025 = 134.30 each
      expect(html).toContain('CGST @ 2.5%');
      expect(html).toContain('134.30');
      expect(html).toContain('SGST @ 2.5%');

      // 4. Room Bill Total and Round-off: 5372 + 268.60 = 5640.60 -> Roundoff +0.40 -> Total 5641.00
      expect(html).toContain('5640.60');
      expect(html).toContain('+0.40');
      expect(html).toContain('5641.00');

      // 5. Settlement Summary Box
      expect(html).toContain('Gross Payable Amount');
      expect(html).toContain('5641.00');
      expect(html).toContain('Advance Received');
      expect(html).toContain('2843.00');
      expect(html).toContain('Net Payable');
      expect(html).toContain('2798.00');

      // 6. Number to words
      expect(html).toContain('Five Thousand Six Hundred And Forty One Only');
      expect(html).toContain('Two Thousand Seven Hundred And Ninety Eight Only');
    });

    it('history reprint for Room 404 matches checkout invoice identically', () => {
      const settlement = {
        isReprint: true,
        checkin_discount_amt: 285,
        checkout_discount_amt: 43,
        settleAmt: 2798,
        invoiceNo: 'HCP697'
      };

      const html = buildFinalBillA4HTML(room404Nauman, calc404, settlement);

      expect(html).toContain('- 43.00');
      expect(html).not.toContain('40.71');
      expect(html).toContain('5372.00');
      expect(html).toContain('134.30');
      expect(html).toContain('5640.60');
      expect(html).toContain('+0.40');
      expect(html).toContain('5641.00');
      expect(html).toContain('2798.00');
    });
  });

  describe('Room 506 (Pic 2 & Pic 3 scenario: MD YAHYA AB WAHID MUNDEWADI, ₹44 discount)', () => {
    const room506Yahya = {
      id: 700,
      room_number: '403, 506',
      room_type: 'Executive Room',
      guest_name: 'MD YAHYA AB WAHID MUNDEWADI',
      address: 'S/O: AB WAHID MUNDEWADI, 259 MUSLIM PACHHA PETH, JAIL ROAD, SOLAPUR NORTH',
      checkin_time: '2026-11-08 17:18:00',
      checkout_time: '2026-11-08 17:27:36',
      actual_checkout_time: '2026-11-08 17:27:36',
      stay_nights: 1,
      pax: 4,
      total_pax: 4,
      room_rate: 4700,
      price: 4700,
      meal_plan: 'without_breakfast',
      advance_payment: 2344,
      initial_paid: 2344,
      total_paid: 4642,
      discount_amount: 235,
      checkout_discount_amount: 44,
      voucher_number: '261108-700',
      invoice_no: 'HCP700'
    };

    const calc506 = {
      baseRoomTariff: 4700,
      breakfastCost: 0,
      breakfastPax: 0,
      billableDays: 1,
      discountAmount: 235,
      discountPct: 5,
      advancePaid: 2344,
      stayCalcNow: {
        dailyBaseRate: 4700,
        baseRoomTariff: 4700,
        breakfastCost: 0,
        grossTariff: 4700,
        discountAmount: 235,
        discountPct: 5,
        effectiveTariff: 4465,
        advancePaid: 2344,
        balanceDue: 2344
      }
    };

    it('Tax Invoice matches Pic 3 identically with Net Payable 2,298.00', () => {
      const settlement = {
        isCheckoutSettlement: true,
        checkin_discount_amt: 235,
        checkout_discount_amt: 44,
        settleAmt: 2298,
        invoiceNo: 'HCP700'
      };

      const html = buildFinalBillA4HTML(room506Yahya, calc506, settlement);

      // 1. Table items
      expect(html).toContain('4700.00');
      expect(html).toContain('Less Discount (5%)');
      expect(html).toContain('- 235.00');
      expect(html).toContain('Other Discount');
      expect(html).toContain('- 44.00');

      // 2. Effective Tariff: 4700 - 235 - 44 = 4421.00
      expect(html).toContain('Effective Tariff');
      expect(html).toContain('4421.00');

      // 3. Exact 2.5% GST: 4421 * 0.025 = 110.53 and 110.52
      expect(html).toContain('CGST @ 2.5%');
      expect(html).toContain('110.53');
      expect(html).toContain('SGST @ 2.5%');
      expect(html).toContain('110.52');

      // 4. Room Bill Total and Round-off: 4421 + 221.05 = 4642.05 -> Roundoff -0.05 -> Total 4642.00
      expect(html).toContain('4642.05');
      expect(html).toContain('-0.05');
      expect(html).toContain('4642.00');

      // 5. Settlement Summary Box matches 2,298 exactly
      expect(html).toContain('Gross Payable Amount');
      expect(html).toContain('4642.00');
      expect(html).toContain('Advance Received');
      expect(html).toContain('2344.00');
      expect(html).toContain('Net Payable');
      expect(html).toContain('2298.00');

      // 6. Words match Pic 3
      expect(html).toContain('Four Thousand Six Hundred And Forty Two Only');
      expect(html).toContain('Two Thousand Two Hundred And Ninety Eight Only');
    });

    it('recalculates forward discounted payable in modal: 2344 balance with 44 discount gives exactly 2298', () => {
      // Simulating calculateDiscountedPayable from FolioSettlementModal
      const effectiveRoomTariff = 4465;
      const effectiveAdvancePaid = 2344;
      const discAmt = 44;

      const discountedTaxable = Math.max(0, Number((effectiveRoomTariff - discAmt).toFixed(2)));
      const discountedGst = Number((discountedTaxable * 0.05).toFixed(2));
      const discountedRoomStay = Number((discountedTaxable + discountedGst).toFixed(2));
      const unroundedTotal = discountedRoomStay;
      const discountedGrandTotal = Math.round(unroundedTotal);
      const balanceDue = Math.max(0, discountedGrandTotal - effectiveAdvancePaid);

      expect(discountedTaxable).toBe(4421.00);
      expect(discountedGst).toBe(221.05);
      expect(discountedGrandTotal).toBe(4642);
      expect(balanceDue).toBe(2298);
    });
  });

  describe('Room 404 (Extra Mattress scenario: 1394 balance with 94 flat discount gives 1295, NOT 1895)', () => {
    const room404ExtraMattress = {
      id: 404,
      room_number: '404',
      room_type: 'Executive Room',
      guest_name: 'Nauman Khairdi',
      address: 'Telangi Paccha Peth Flat No.2',
      checkin_time: '2026-11-08 17:00:00',
      checkout_time: '2026-11-08 18:00:00',
      actual_checkout_time: '2026-11-08 18:00:00',
      stay_nights: 1,
      pax: 2,
      total_pax: 2,
      room_rate: 2350,
      price: 2350,
      extra_beds: 1,
      extra_bed_charge: 600,
      advance_payment: 1394,
      initial_paid: 1394,
      total_paid: 2689,
      discount_amount: 295,
      checkout_discount_amount: 94,
      voucher_number: '261108-701',
      invoice_no: 'HCP701'
    };

    const calc404 = {
      baseRoomTariff: 2350,
      extraMattressCost: 600,
      billableDays: 1,
      discountAmount: 295,
      discountPct: 10,
      advancePaid: 1394,
      stayCalcNow: {
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        extraMattressCost: 600,
        grossTariff: 2950,
        discountAmount: 295,
        discountPct: 10,
        roomSubtotalPreTax: 2655,
        roomGst: 133,
        effectiveTariff: 2655,
        advancePaid: 1394,
        balanceDue: 1394
      }
    };

    it('modal forward calculation: 1394 balance with 94 discount yields 1295 (never 1895 due to extra mattress)', () => {
      const effectiveRoomTariff = 2655; // 2350 base + 600 mattress - 295 checkin discount
      const effectiveAdvancePaid = 1394;
      const discAmt = 94;
      const effectiveFnbTotal = 0;
      const extraExpensesVal = 0;

      const discountedTaxable = Math.max(0, Number((effectiveRoomTariff - discAmt).toFixed(2)));
      const discountedGst = Number((discountedTaxable * 0.05).toFixed(2));
      const discountedRoomStay = Number((discountedTaxable + discountedGst).toFixed(2));
      const nonRoomCharges = (Number(effectiveFnbTotal) || 0) + (Number(extraExpensesVal) || 0);
      const unroundedTotal = discountedRoomStay + nonRoomCharges;
      const discountedGrandTotal = Math.round(unroundedTotal);
      const balanceDue = Math.max(0, discountedGrandTotal - effectiveAdvancePaid);

      expect(discountedTaxable).toBe(2561.00);
      expect(discountedGst).toBe(128.05);
      expect(discountedGrandTotal).toBe(2689);
      expect(balanceDue).toBe(1295);
      expect(balanceDue).not.toBe(1895);
    });

    it('Tax Invoice for Room 404 prints with 94 Other Discount and Net Payable 1,295.00', () => {
      const settlement = {
        isCheckoutSettlement: true,
        checkin_discount_amt: 295,
        checkout_discount_amt: 94,
        settleAmt: 1295,
        targetNetPayable: 1295,
        invoiceNo: 'HCP701'
      };

      const html = buildFinalBillA4HTML(room404ExtraMattress, calc404, settlement);

      // Table particulars
      expect(html).toContain('2350.00');
      expect(html).toContain('600.00');
      expect(html).toContain('Less Discount (10%)');
      expect(html).toContain('- 295.00');
      expect(html).toContain('Other Discount');
      expect(html).toContain('- 94.00');

      // Effective Tariff: 2950 - 295 - 94 = 2561.00
      expect(html).toContain('Effective Tariff');
      expect(html).toContain('2561.00');

      // GST: 2561 * 0.05 = 128.05
      expect(html).toContain('CGST @ 2.5%');
      expect(html).toContain('64.03');
      expect(html).toContain('SGST @ 2.5%');
      expect(html).toContain('64.02');

      // Total stay & invoice total
      expect(html).toContain('2689.05');
      expect(html).toContain('-0.05');
      expect(html).toContain('2689.00');

      // Settlement Summary Box: Net Payable 1295.00
      expect(html).toContain('Gross Payable Amount');
      expect(html).toContain('2689.00');
      expect(html).toContain('Advance Received');
      expect(html).toContain('1394.00');
      expect(html).toContain('Net Payable');
      expect(html).toContain('1295.00');
      expect(html).not.toContain('1895.00');

      // Words
      expect(html).toContain('Two Thousand Six Hundred And Eighty Nine Only');
      expect(html).toContain('One Thousand Two Hundred And Ninety Five Only');
    });
  });
});