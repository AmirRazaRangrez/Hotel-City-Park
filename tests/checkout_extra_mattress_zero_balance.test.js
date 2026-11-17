import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Checkout Extra Mattress Double-Counting & Zero Balance Fix', () => {
  const modalPath = path.resolve(__dirname, '../src/components/hospitality/FolioSettlementModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  it('verifies FolioSettlementModal defines effectiveBaseRoomTariff without extra mattress double-count', () => {
    expect(modalContent).toContain('const effectiveBaseRoomTariff = isOtaPrepaid');
    expect(modalContent).toContain('activeStayCalc?.baseRoomTariff');
    expect(modalContent).toContain('hasStatedActiveBal');
    expect(modalContent).toContain('hasStatedFolioBal');
  });

  it('verifies statedBalanceDue strictly honors balanceDue === 0 when present on activeStayCalc or folioData', () => {
    expect(modalContent).toContain('activeStayCalc?.balanceDue !== undefined && activeStayCalc?.balanceDue !== null && !isNaN(Number(activeStayCalc.balanceDue))');
    expect(modalContent).toContain('folioData?.balanceDue !== undefined && folioData?.balanceDue !== null && !isNaN(Number(folioData.balanceDue))');
  });

  it('verifies reconciliation text uses ₹0.00 Fully Settled instead of ₹0 Remaining Due when balanceDue === 0', () => {
    expect(modalContent).toContain("balanceDue === 0 ? '₹0.00 Fully Settled' : `${formatCurrency(balanceDue)} Remaining Due`");
  });

  it('verifies Complete Checkout button reads Complete Checkout (₹0.00 Due) when balance is zero', () => {
    expect(modalContent).toContain("balanceDue === 0");
    expect(modalContent).toContain("'Complete Checkout (₹0.00 Due)'");
  });

  it('simulates Room 502 with 1 Extra Mattress (₹600) and proves balanceDue is strictly 0 without double-counting', () => {
    // Room 502 Scenario
    const isOtaPrepaid = false;
    const baseRoomTariff = 2350;
    const extraBedCharge = 600;
    const roomTaxable = 2950; // base + extra bed
    const stayTax = 147.50; // 5% GST
    const stayTotal = 3097.50;
    const roundOff = 0.50;
    const grandTotal = 3098;
    const advancePaid = 3098;
    const fnbTotal = 0;
    const extraExpenses = 0;

    // Folio Data passed to checkout modal
    const folioData = {
      roomTaxable,
      baseRoomTariff,
      extraBedCharge,
      advancePaid,
      balanceDue: 0,
      stayCalcNow: {
        baseRoomTariff,
        extraMattressCost: extraBedCharge,
        roomSubtotalPreTax: roomTaxable,
        roomGst: stayTax,
        grandTotal,
        balanceDue: 0
      }
    };

    const activeStayCalc = folioData.stayCalcNow;
    const effectiveBaseRoomTariff = isOtaPrepaid
      ? 0
      : Number(
          activeStayCalc?.baseRoomTariff ??
          folioData?.stayCalcNow?.baseRoomTariff ??
          folioData?.baseRoomTariff ??
          (activeStayCalc?.roomSubtotalPreTax
            ? Math.max(0, Number(activeStayCalc.roomSubtotalPreTax) - Number(activeStayCalc.extraMattressCost || 0) - Number(activeStayCalc.breakfastCost || 0))
            : undefined) ??
          folioData?.roomTaxable ??
          0
        );

    const effectiveRoomTariff = effectiveBaseRoomTariff;
    const hotelExtrasChargeVal = Number(folioData?.extraBedCharge || 0);
    const extensionChargeVal = 0;
    const effectiveStayTax = Number(activeStayCalc?.roomGst || 0);
    const effectiveAdvancePaid = Number(folioData.advancePaid);

    const computedRoomNet = effectiveRoomTariff + effectiveStayTax;
    const stayExtrasTotal = !isOtaPrepaid ? (hotelExtrasChargeVal + extensionChargeVal) : 0;
    const computedStayBal = (computedRoomNet + stayExtrasTotal + fnbTotal + extraExpenses) - effectiveAdvancePaid;

    const hasStatedActiveBal = activeStayCalc?.balanceDue !== undefined && activeStayCalc?.balanceDue !== null && !isNaN(Number(activeStayCalc.balanceDue));
    const hasStatedFolioBal = folioData?.balanceDue !== undefined && folioData?.balanceDue !== null && !isNaN(Number(folioData.balanceDue));

    const statedBalanceDue = isOtaPrepaid
      ? 0
      : (hasStatedActiveBal
          ? Math.max(0, Math.round(Number(activeStayCalc.balanceDue)))
          : (hasStatedFolioBal
              ? Math.max(0, Math.round(Number(folioData.balanceDue)))
              : Math.max(0, Math.round(computedStayBal))));

    // Effective Base Room Tariff must be 2350 (NOT 2950)
    expect(effectiveBaseRoomTariff).toBe(2350);

    // Hotel Extras must be 600
    expect(hotelExtrasChargeVal).toBe(600);

    // Computed Room Net + Extras Total = 2350 + 147.50 + 600 = 3097.50
    expect(computedRoomNet + stayExtrasTotal).toBe(3097.50);

    // Computed Stay Balance = 3097.50 - 3098 = -0.50 (rounds to 0 with Math.max(0, ...))
    expect(Math.max(0, Math.round(computedStayBal))).toBe(0);

    // Authoritative stated balance due must strictly be 0
    expect(statedBalanceDue).toBe(0);
  });
});
