const fs = require('fs');
const path = require('path');

// =========================================================================
// 1. src/services/printService.js
// =========================================================================
const printServicePath = path.resolve(__dirname, '../src/services/printService.js');
let printRaw = fs.readFileSync(printServicePath, 'utf8');
const isPrintCrlf = printRaw.includes('\r\n');
let printContent = printRaw.replace(/\r\n/g, '\n');

// 1a. Base room daily rate & baseRoomTariffTotal in printService.js
const printTarget1 = `  const baseRoomDailyRate = (isBookingOta && otaBillAmount > 0)
    ? Number((otaPreTaxBase / billableDays).toFixed(2))
    : Number(
        c.stayCalcNow?.dailyBaseRate ??
        c.stayCalcDeclared?.dailyBaseRate ??
        r.room_rate ??
        r.price ??
        2000
      );
  const explicitBaseRoomTariff = (isEarlyCheckoutOrSettlement && (c.stayCalcNow?.baseRoomTariff !== undefined || summary.stayCalcNow?.baseRoomTariff !== undefined))
    ? Number(c.stayCalcNow?.baseRoomTariff ?? summary.stayCalcNow?.baseRoomTariff)
    : (c.baseRoomTariff !== undefined ? Number(c.baseRoomTariff) :
      (c.stayCalcNow?.baseRoomTariff !== undefined ? Number(c.stayCalcNow.baseRoomTariff) :
        (c.stayCalcDeclared?.baseRoomTariff !== undefined ? Number(c.stayCalcDeclared.baseRoomTariff) : null)));

  let baseRoomTariffTotal = 0;
  if (isBookingOta && otaBillAmount > 0) {
    baseRoomTariffTotal = otaPreTaxBase;
  } else if (explicitBaseRoomTariff !== null && !isNaN(explicitBaseRoomTariff)) {
    baseRoomTariffTotal = explicitBaseRoomTariff;
  } else if (c.stayCalcNow?.baseRoomTariff !== undefined) {
    baseRoomTariffTotal = Number(c.stayCalcNow.baseRoomTariff);
  } else if (Number(c.roomGrossTariff || c.grossTariff || 0) > 0 && !isAlreadyCheckedOut) {
    baseRoomTariffTotal = Math.max(0, Number(c.roomGrossTariff || c.grossTariff) - breakfastPlanTotal);
  } else {
    baseRoomTariffTotal = baseRoomDailyRate * billableDays;
  }`;

const printReplace1 = `  const rawSnapshot = r.tax_invoice_snapshot || r.tax_invoice_snapshot_json || c.tax_invoice_snapshot || c.tax_invoice_snapshot_json;
  let parsedSnapshot = null;
  if (rawSnapshot) {
    try {
      parsedSnapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
    } catch (_) { }
  }
  const snapshotCalc = parsedSnapshot?.stayCalcNow || parsedSnapshot?.activeStayCalc || r.stayCalcNow || c.stayCalcNow;

  const baseRoomDailyRate = (isBookingOta && otaBillAmount > 0)
    ? Number((otaPreTaxBase / billableDays).toFixed(2))
    : Number(
        snapshotCalc?.dailyBaseRate ??
        c.stayCalcNow?.dailyBaseRate ??
        c.stayCalcDeclared?.dailyBaseRate ??
        r.room_rate ??
        r.price_single ??
        r.price ??
        2050
      );
  const explicitBaseRoomTariff = (isEarlyCheckoutOrSettlement && (snapshotCalc?.baseRoomTariff !== undefined || c.stayCalcNow?.baseRoomTariff !== undefined || summary.stayCalcNow?.baseRoomTariff !== undefined))
    ? Number(snapshotCalc?.baseRoomTariff ?? c.stayCalcNow?.baseRoomTariff ?? summary.stayCalcNow?.baseRoomTariff)
    : (snapshotCalc?.baseRoomTariff !== undefined ? Number(snapshotCalc.baseRoomTariff) :
      (c.baseRoomTariff !== undefined ? Number(c.baseRoomTariff) :
        (c.stayCalcNow?.baseRoomTariff !== undefined ? Number(c.stayCalcNow.baseRoomTariff) :
          (c.stayCalcDeclared?.baseRoomTariff !== undefined ? Number(c.stayCalcDeclared.baseRoomTariff) : null))));

  let baseRoomTariffTotal = 0;
  if (isBookingOta && otaBillAmount > 0) {
    baseRoomTariffTotal = otaPreTaxBase;
  } else if (explicitBaseRoomTariff !== null && !isNaN(explicitBaseRoomTariff)) {
    baseRoomTariffTotal = explicitBaseRoomTariff;
  } else if (snapshotCalc?.baseRoomTariff !== undefined) {
    baseRoomTariffTotal = Number(snapshotCalc.baseRoomTariff);
  } else if (c.stayCalcNow?.baseRoomTariff !== undefined) {
    baseRoomTariffTotal = Number(c.stayCalcNow.baseRoomTariff);
  } else if (Number(c.roomGrossTariff || c.grossTariff || 0) > 0 && !isAlreadyCheckedOut) {
    baseRoomTariffTotal = Math.max(0, Number(c.roomGrossTariff || c.grossTariff) - breakfastPlanTotal);
  } else {
    baseRoomTariffTotal = baseRoomDailyRate * billableDays;
  }`;

if (printContent.includes(printTarget1)) {
  printContent = printContent.replace(printTarget1, printReplace1);
  console.log('✓ printService.js: baseRoomDailyRate & snapshot prioritization applied');
} else {
  console.warn('⚠️ printService.js: printTarget1 not found');
}

// 1b. Effective tariff snapshot parity
const printTarget2 = `    const extraMattressInEffective = !isBookingOta && (!isMattressPrebookedInOta && extraBedCharge > 0);
    let effectiveTariff = Number(Math.max(0, (baseRoomTariffTotal + breakfastPlanTotal + (extraMattressInEffective ? extraMattressPreTax : 0) - totalDiscountAmt)).toFixed(2));`;

const printReplace2 = `    const extraMattressInEffective = !isBookingOta && (!isMattressPrebookedInOta && extraBedCharge > 0);
    const snapEffective = snapshotCalc?.effectiveTariff ?? snapshotCalc?.roomSubtotalPreTax;
    let effectiveTariff = (snapEffective !== undefined && snapEffective !== null && !isBookingOta)
      ? Number(snapEffective)
      : Number(Math.max(0, (baseRoomTariffTotal + breakfastPlanTotal + (extraMattressInEffective ? extraMattressPreTax : 0) - totalDiscountAmt)).toFixed(2));`;

if (printContent.includes(printTarget2)) {
  printContent = printContent.replace(printTarget2, printReplace2);
  console.log('✓ printService.js: effectiveTariff snapshot parity applied');
} else {
  console.warn('⚠️ printService.js: printTarget2 not found');
}

// 1c. Refund vs Net Payable in printService.js (eliminate false round-off refund)
const printTarget3 = `    const explicitRefund = Number(s?.refundAmount || s?.refund_amount || s?.refundAmt || c?.refundAmount || c?.refund_amount || r?.refund_amount || 0);
    const rawDiff = grossPayable - totalAdvanceOrVoucher;
    const isRefundPending = rawDiff < 0 || explicitRefund > 0;
    const refundAmount = isRefundPending ? (explicitRefund > 0 ? explicitRefund : Math.abs(rawDiff)) : 0;
    let netPayable = isRefundPending ? 0 : Math.max(0, rawDiff);`;

const printReplace3 = `    const explicitRefund = Number(s?.refundAmount || s?.refund_amount || s?.refundAmt || r?.refund_amount || 0);
    const rawDiff = Number((grossPayable - totalAdvanceOrVoucher).toFixed(2));
    // Safety: Round-off difference (<= ₹0.51) when invoice total matches advance is NOT a customer refund!
    const isRealRefund = (explicitRefund > 0.50) || (rawDiff < -0.50);
    const isRefundPending = isRealRefund;
    const refundAmount = isRefundPending ? (explicitRefund > 0.50 ? explicitRefund : Math.abs(rawDiff)) : 0;
    let netPayable = isRefundPending ? 0 : (Math.abs(rawDiff) <= 0.51 ? 0 : Math.max(0, rawDiff));`;

if (printContent.includes(printTarget3)) {
  printContent = printContent.replace(printTarget3, printReplace3);
  console.log('✓ printService.js: round-off refund elimination applied');
} else {
  console.warn('⚠️ printService.js: printTarget3 not found');
}

if (isPrintCrlf) printContent = printContent.replace(/\n/g, '\r\n');
fs.writeFileSync(printServicePath, printContent, 'utf8');

// =========================================================================
// 2. admin/src/lib/crmPrintTemplates.ts
// =========================================================================
const adminPrintPath = path.resolve(__dirname, '../admin/src/lib/crmPrintTemplates.ts');
let adminRaw = fs.readFileSync(adminPrintPath, 'utf8');
const isAdminCrlf = adminRaw.includes('\r\n');
let adminContent = adminRaw.replace(/\r\n/g, '\n');

const adminTarget1 = `  const baseRoomDailyRate = (isBookingOta && otaBillAmount > 0)
    ? Number((otaPreTaxBase / billableDays).toFixed(2))
    : Number(
    c.stayCalcNow?.dailyBaseRate ?? 
    c.stayCalcDeclared?.dailyBaseRate ?? 
    r.room_rate ?? 
    r.price ?? 
    2000
  );
  const explicitBaseRoomTariff = (isEarlyCheckoutOrSettlement && (c.stayCalcNow?.baseRoomTariff !== undefined || summary.stayCalcNow?.baseRoomTariff !== undefined))
    ? Number(c.stayCalcNow?.baseRoomTariff ?? summary.stayCalcNow?.baseRoomTariff)
    : (c.baseRoomTariff !== undefined ? Number(c.baseRoomTariff) :
      (c.stayCalcNow?.baseRoomTariff !== undefined ? Number(c.stayCalcNow.baseRoomTariff) :
      (c.stayCalcDeclared?.baseRoomTariff !== undefined ? Number(c.stayCalcDeclared.baseRoomTariff) : null)));

  const otaPreTaxBase = (isBookingOta && otaBillAmount > 0)
    ? Math.round((otaBillAmount / 1.05) * 100) / 100
    : 0;

  let baseRoomTariffTotal = 0;
  if (isBookingOta && otaBillAmount > 0) {
    baseRoomTariffTotal = otaPreTaxBase;
  } else if (explicitBaseRoomTariff !== null && !isNaN(explicitBaseRoomTariff)) {
    baseRoomTariffTotal = explicitBaseRoomTariff;
  } else if (Number(c.roomGrossTariff || c.grossTariff || 0) > 0) {
    baseRoomTariffTotal = Math.max(0, Number(c.roomGrossTariff || c.grossTariff) - breakfastPlanTotal);
  } else {
    baseRoomTariffTotal = baseRoomDailyRate * billableDays;
  }`;

const adminReplace1 = `  const rawSnapshot = r.tax_invoice_snapshot || r.tax_invoice_snapshot_json || c.tax_invoice_snapshot || c.tax_invoice_snapshot_json;
  let parsedSnapshot: any = null;
  if (rawSnapshot) {
    try {
      parsedSnapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
    } catch (_) { }
  }
  const snapshotCalc = parsedSnapshot?.stayCalcNow || parsedSnapshot?.activeStayCalc || r.stayCalcNow || c.stayCalcNow;

  const baseRoomDailyRate = (isBookingOta && otaBillAmount > 0)
    ? Number((otaPreTaxBase / billableDays).toFixed(2))
    : Number(
    snapshotCalc?.dailyBaseRate ?? 
    c.stayCalcNow?.dailyBaseRate ?? 
    c.stayCalcDeclared?.dailyBaseRate ?? 
    r.room_rate ?? 
    r.price_single ?? 
    r.price ?? 
    2050
  );
  const explicitBaseRoomTariff = (isEarlyCheckoutOrSettlement && (snapshotCalc?.baseRoomTariff !== undefined || c.stayCalcNow?.baseRoomTariff !== undefined || summary.stayCalcNow?.baseRoomTariff !== undefined))
    ? Number(snapshotCalc?.baseRoomTariff ?? c.stayCalcNow?.baseRoomTariff ?? summary.stayCalcNow?.baseRoomTariff)
    : (snapshotCalc?.baseRoomTariff !== undefined ? Number(snapshotCalc.baseRoomTariff) :
      (c.baseRoomTariff !== undefined ? Number(c.baseRoomTariff) :
      (c.stayCalcNow?.baseRoomTariff !== undefined ? Number(c.stayCalcNow.baseRoomTariff) :
      (c.stayCalcDeclared?.baseRoomTariff !== undefined ? Number(c.stayCalcDeclared.baseRoomTariff) : null))));

  const otaPreTaxBase = (isBookingOta && otaBillAmount > 0)
    ? Math.round((otaBillAmount / 1.05) * 100) / 100
    : 0;

  let baseRoomTariffTotal = 0;
  if (isBookingOta && otaBillAmount > 0) {
    baseRoomTariffTotal = otaPreTaxBase;
  } else if (explicitBaseRoomTariff !== null && !isNaN(explicitBaseRoomTariff)) {
    baseRoomTariffTotal = explicitBaseRoomTariff;
  } else if (snapshotCalc?.baseRoomTariff !== undefined) {
    baseRoomTariffTotal = Number(snapshotCalc.baseRoomTariff);
  } else if (Number(c.roomGrossTariff || c.grossTariff || 0) > 0 && !isAlreadyCheckedOut) {
    baseRoomTariffTotal = Math.max(0, Number(c.roomGrossTariff || c.grossTariff) - breakfastPlanTotal);
  } else {
    baseRoomTariffTotal = baseRoomDailyRate * billableDays;
  }`;

if (adminContent.includes(adminTarget1)) {
  adminContent = adminContent.replace(adminTarget1, adminReplace1);
  console.log('✓ crmPrintTemplates.ts: baseRoomDailyRate & snapshot prioritization applied');
} else {
  console.warn('⚠️ crmPrintTemplates.ts: adminTarget1 not found');
}

// 2b. Effective tariff snapshot parity in crmPrintTemplates.ts
const adminTarget2 = `  const extraMattressInEffective = !isBookingOta && (!isMattressPrebookedInOta && extraBedCharge > 0);
  effectiveTariff = Number(Math.max(0, (baseRoomTariffTotal + breakfastPlanTotal + (extraMattressInEffective ? extraMattressPreTax : 0) - discountAmt)).toFixed(2));`;

const adminReplace2 = `  const extraMattressInEffective = !isBookingOta && (!isMattressPrebookedInOta && extraBedCharge > 0);
  const snapEffective = snapshotCalc?.effectiveTariff ?? snapshotCalc?.roomSubtotalPreTax;
  effectiveTariff = (snapEffective !== undefined && snapEffective !== null && !isBookingOta)
    ? Number(snapEffective)
    : Number(Math.max(0, (baseRoomTariffTotal + breakfastPlanTotal + (extraMattressInEffective ? extraMattressPreTax : 0) - discountAmt)).toFixed(2));`;

if (adminContent.includes(adminTarget2)) {
  adminContent = adminContent.replace(adminTarget2, adminReplace2);
  console.log('✓ crmPrintTemplates.ts: effectiveTariff snapshot parity applied');
} else {
  console.warn('⚠️ crmPrintTemplates.ts: adminTarget2 not found');
}

// 2c. Refund vs Net Payable in crmPrintTemplates.ts
const adminTarget3 = `  const explicitRefund = Number(s?.refundAmount || s?.refund_amount || s?.refundAmt || c?.refundAmount || c?.refund_amount || r?.refund_amount || 0);
  const rawDiff = grossPayable - totalAdvanceOrVoucher;
  const isRefundPending = rawDiff < 0 || explicitRefund > 0;
  const refundAmount = isRefundPending ? (explicitRefund > 0 ? explicitRefund : Math.abs(rawDiff)) : 0;

  if (isRefundPending) {
    netPayable = 0;
  } else if (targetSettlementNet !== null && targetSettlementNet >= 0) {
    netPayable = targetSettlementNet;
  } else {
    netPayable = Math.max(0, rawDiff);
  }`;

const adminReplace3 = `  const explicitRefund = Number(s?.refundAmount || s?.refund_amount || s?.refundAmt || r?.refund_amount || 0);
  const rawDiff = Number((grossPayable - totalAdvanceOrVoucher).toFixed(2));
  // Safety: Round-off difference (<= ₹0.51) when invoice total matches advance is NOT a customer refund!
  const isRealRefund = (explicitRefund > 0.50) || (rawDiff < -0.50);
  const isRefundPending = isRealRefund;
  const refundAmount = isRefundPending ? (explicitRefund > 0.50 ? explicitRefund : Math.abs(rawDiff)) : 0;

  if (isRefundPending) {
    netPayable = 0;
  } else if (targetSettlementNet !== null && targetSettlementNet >= 0) {
    netPayable = targetSettlementNet;
  } else if (Math.abs(rawDiff) <= 0.51) {
    netPayable = 0;
  } else {
    netPayable = Math.max(0, rawDiff);
  }`;

if (adminContent.includes(adminTarget3)) {
  adminContent = adminContent.replace(adminTarget3, adminReplace3);
  console.log('✓ crmPrintTemplates.ts: round-off refund elimination applied');
} else {
  console.warn('⚠️ crmPrintTemplates.ts: adminTarget3 not found');
}

if (isAdminCrlf) adminContent = adminContent.replace(/\n/g, '\r\n');
fs.writeFileSync(adminPrintPath, adminContent, 'utf8');

// =========================================================================
// 3. src/components/hospitality/DocumentActionModal.jsx
// =========================================================================
const docModalPath = path.resolve(__dirname, '../src/components/hospitality/DocumentActionModal.jsx');
let docRaw = fs.readFileSync(docModalPath, 'utf8');
const isDocCrlf = docRaw.includes('\r\n');
let docContent = docRaw.replace(/\r\n/g, '\n');

const docTarget1 = `    if (invData.room) {
      const room = invData.room;
      const baseCalc = invData.calc || invData.room;
      const activeCalc = room.tax_invoice_snapshot?.stayCalcNow || room.stayCalcNow || baseCalc?.stayCalcNow;`;

const docReplace1 = `    if (invData.room) {
      const room = invData.room;
      const baseCalc = invData.calc || invData.room;
      const rawSnap = room.tax_invoice_snapshot || room.tax_invoice_snapshot_json || baseCalc?.tax_invoice_snapshot;
      const snapshot = typeof rawSnap === 'string' ? JSON.parse(rawSnap) : rawSnap;
      const activeCalc = snapshot?.stayCalcNow || snapshot?.activeStayCalc || room.stayCalcNow || baseCalc?.stayCalcNow;`;

if (docContent.includes(docTarget1)) {
  docContent = docContent.replace(docTarget1, docReplace1);
  console.log('✓ DocumentActionModal.jsx: snapshot parsing in structured invData applied');
} else {
  console.warn('⚠️ DocumentActionModal.jsx: docTarget1 not found');
}

const docTarget2 = `    // Flat booking or room object
    const room = invData;
    const activeCalc = room.tax_invoice_snapshot?.stayCalcNow || room.stayCalcNow;
    const calc = {
      grossTariff: activeCalc?.grossTariff || room.grossTariff || room.total_room_charge || room.room_rate,
      roomCharge: activeCalc?.baseRoomTariff || room.total_room_charge || room.room_rate,
      baseRoomTariff: activeCalc?.baseRoomTariff ?? room.baseRoomTariff,`;

const docReplace2 = `    // Flat booking or room object
    const room = invData;
    const rawSnap = room.tax_invoice_snapshot || room.tax_invoice_snapshot_json;
    const snapshot = typeof rawSnap === 'string' ? JSON.parse(rawSnap) : rawSnap;
    const activeCalc = snapshot?.stayCalcNow || snapshot?.activeStayCalc || room.stayCalcNow;
    const calc = {
      grossTariff: activeCalc?.grossTariff || room.grossTariff || room.total_room_charge || room.room_rate,
      roomCharge: activeCalc?.baseRoomTariff || room.room_rate || room.total_room_charge,
      baseRoomTariff: activeCalc?.baseRoomTariff ?? room.baseRoomTariff ?? room.room_rate,`;

if (docContent.includes(docTarget2)) {
  docContent = docContent.replace(docTarget2, docReplace2);
  console.log('✓ DocumentActionModal.jsx: snapshot parsing in flat invData applied');
} else {
  console.warn('⚠️ DocumentActionModal.jsx: docTarget2 not found');
}

if (isDocCrlf) docContent = docContent.replace(/\n/g, '\r\n');
fs.writeFileSync(docModalPath, docContent, 'utf8');

// =========================================================================
// 4. src/components/hospitality/HospitalityHistory.jsx
// =========================================================================
const histPath = path.resolve(__dirname, '../src/components/hospitality/HospitalityHistory.jsx');
let histRaw = fs.readFileSync(histPath, 'utf8');
const isHistCrlf = histRaw.includes('\r\n');
let histContent = histRaw.replace(/\r\n/g, '\n');

const histTarget1 = `                    onClick={() => {
                      const activeCalc = detailBooking.tax_invoice_snapshot?.stayCalcNow || detailBooking.stayCalcNow;
                      setDocActionModal({`;

const histReplace1 = `                    onClick={() => {
                      const rawSnap = detailBooking.tax_invoice_snapshot || detailBooking.tax_invoice_snapshot_json;
                      const snapshot = typeof rawSnap === 'string' ? JSON.parse(rawSnap) : rawSnap;
                      const activeCalc = snapshot?.stayCalcNow || snapshot?.activeStayCalc || detailBooking.stayCalcNow;
                      setDocActionModal({`;

if (histContent.includes(histTarget1)) {
  histContent = histContent.replace(histTarget1, histReplace1);
  console.log('✓ HospitalityHistory.jsx: snapshot parsing at line 1731 applied');
} else {
  console.warn('⚠️ HospitalityHistory.jsx: histTarget1 not found');
}

const histTarget2 = `                        onClick={() => {
                            const activeCalc = detailBooking.tax_invoice_snapshot?.stayCalcNow || detailBooking.stayCalcNow;
                            setDocActionModal({`;

const histReplace2 = `                        onClick={() => {
                            const rawSnap = detailBooking.tax_invoice_snapshot || detailBooking.tax_invoice_snapshot_json;
                            const snapshot = typeof rawSnap === 'string' ? JSON.parse(rawSnap) : rawSnap;
                            const activeCalc = snapshot?.stayCalcNow || snapshot?.activeStayCalc || detailBooking.stayCalcNow;
                            setDocActionModal({`;

if (histContent.includes(histTarget2)) {
  histContent = histContent.replace(histTarget2, histReplace2);
  console.log('✓ HospitalityHistory.jsx: snapshot parsing at line 3313 applied');
} else {
  console.warn('⚠️ HospitalityHistory.jsx: histTarget2 not found');
}

if (isHistCrlf) histContent = histContent.replace(/\n/g, '\r\n');
fs.writeFileSync(histPath, histContent, 'utf8');

console.log('All frontend reprint & refund patches applied successfully!');

