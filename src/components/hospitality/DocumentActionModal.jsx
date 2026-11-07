import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  printGuestRegistrationA4,
  downloadGuestRegistrationPDF,
  printGuestPaymentSummary,
  downloadGuestPaymentSummaryPDF,
  printGuestActivitiesSummary,
  downloadGuestActivitiesSummaryPDF,
  printFinalBillA4,
  downloadFinalBillPDF,
  formatTaxInvoiceNumber,
  printCForm,
  downloadCFormPDF
} from '../../services/printService';

export default function DocumentActionModal({
  isOpen,
  onClose,
  type = 'info', // 'checkin' | 'invoice' | 'info' | 'summary' | 'activities'
  data,
  onReprintRegForm
}) {
  const { showToast, currentUser } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.key === '1' || e.key === 's' || e.key === 'S') && !isProcessing) {
        e.preventDefault();
        handleSave();
      } else if ((e.key === '2' || e.key === 'p' || e.key === 'P') && !isProcessing) {
        e.preventDefault();
        handlePrint();
      } else if (e.key === '3' && !isProcessing) {
        e.preventDefault();
        handleSaveAndPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, data, type]);

  if (!isOpen || !data) return null;

  const getDocTitle = (docType) => {
    switch (docType) {
      case 'checkin':
        return '📋 Check-In Form';
      case 'invoice':
        return '🧾 Tax Invoice';
      case 'summary':
        return '📄 Payment Summary';
      case 'activities':
        return '📑 Activities Summary';
      case 'cform':
        return "🛂 Form 'C'";
      case 'info':
      default:
        return '💾 Info';
    }
  };

  const getInvoiceParams = (invData) => {
    if (!invData) return { room: null, calc: null, settlement: null };
    const cashierName = currentUser?.full_name || currentUser?.name || currentUser?.username || 'Cashier_1';
    if (invData.room) {
      const room = invData.room;
      const baseCalc = invData.calc || invData.room;
      const activeCalc = room.tax_invoice_snapshot?.stayCalcNow || room.stayCalcNow || baseCalc?.stayCalcNow;
      return {
        room,
        calc: {
          ...baseCalc,
          adults_male: baseCalc.adults_male ?? room.adults_male,
          adults_female: baseCalc.adults_female ?? room.adults_female,
          adultsMale: baseCalc.adultsMale ?? room.adultsMale,
          adultsFemale: baseCalc.adultsFemale ?? room.adultsFemale,
          total_adults: baseCalc.total_adults ?? room.total_adults,
          totalAdults: baseCalc.totalAdults ?? room.totalAdults,
          children: baseCalc.children ?? room.children,
          pax: baseCalc.pax ?? room.pax,
          totalPax: baseCalc.totalPax ?? room.totalPax,
          group_room_details: baseCalc.group_room_details || room.group_room_details || room.all_group_rooms,
          all_group_rooms: baseCalc.all_group_rooms || room.all_group_rooms,
          extensionSlotLabel: baseCalc.extensionSlotLabel || activeCalc?.extensionSlotLabel || room.extensionSlotLabel,
          extensionHours: baseCalc.extensionHours ?? activeCalc?.extensionHours ?? room.extension_hours,
          extensionCharge: baseCalc.extensionCharge ?? activeCalc?.extensionCharge ?? room.extension_charge
        },
        settlement: invData.settlement || {
          settleAmt: room.final_settlement_payment || room.final_settle_amount || 0,
          refundAmt: room.refund_amount || 0,
          settled_at: room.actual_checkout_time || room.checkout_time || new Date(),
          invoiceNo: room.invoice_no,
          checked_out_by: room.checked_out_by || cashierName
        }
      };
    }
    // Flat booking or room object
    const room = invData;
    const activeCalc = room.tax_invoice_snapshot?.stayCalcNow || room.stayCalcNow;
    const calc = {
      grossTariff: activeCalc?.grossTariff || room.grossTariff || room.total_room_charge || room.room_rate,
      roomCharge: activeCalc?.baseRoomTariff || room.total_room_charge || room.room_rate,
      baseRoomTariff: activeCalc?.baseRoomTariff ?? room.baseRoomTariff,
      extraMattressCost: activeCalc?.extraMattressCost ?? room.extraMattressCost,
      extraMattressDailyRate: activeCalc?.extraMattressDailyRate,
      breakfastCost: activeCalc?.breakfastCost ?? room.breakfastCost,
      breakfastPax: activeCalc?.breakfastPax ?? room.breakfastPax,
      breakfastDailyRate: activeCalc?.breakfastDailyRate,
      roomTariffNet: activeCalc?.effectiveTariff || Math.max(0, (Number(room.total_room_charge || room.room_rate || 0)) - (Number(room.discount_amount || 0))),
      tariffTax5Pct: activeCalc?.taxAmount || room.tax_amount || room.total_tax || Math.max(0, Math.round((room.total_room_charge || 0) - ((room.total_room_charge || 0) / 1.05))),
      foodTotal: room.food_total || 0,
      barTotal: room.bar_total || 0,
      hotelExtrasCharge: activeCalc?.extraMattressCost || room.extra_bed_charge || 0,
      advancePaid: activeCalc?.advancePaid ?? (room.advance_payment !== undefined && room.advance_payment !== null && Number(room.advance_payment) > 0
        ? Number(room.advance_payment)
        : Math.max(0, Number(room.total_paid || 0) - Number(room.final_settlement_payment || 0))),
      chargedDays: activeCalc?.chargedDays || room.charged_days || 1,
      billableDays: activeCalc?.billableDays || room.charged_days || 1,
      discountPct: activeCalc?.discountPct ?? room.discount_pct ?? 0,
      discountAmount: activeCalc?.discountAmount ?? room.discount_amount ?? 0,
      stayCalcNow: activeCalc || null,
      stayCalcDeclared: room.stayCalcDeclared || room.tax_invoice_snapshot?.stayCalcDeclared || null,
      restaurantOrders: room.restaurantOrders || room.restaurant_orders || [],
      barOrders: room.barOrders || room.bar_orders || [],
      adults_male: room.adults_male,
      adults_female: room.adults_female,
      adultsMale: room.adultsMale ?? room.adults_male,
      adultsFemale: room.adultsFemale ?? room.adults_female,
      total_adults: room.total_adults ?? room.totalAdults,
      totalAdults: room.totalAdults ?? room.total_adults,
      children: room.children,
      pax: room.pax,
      totalPax: room.totalPax ?? room.pax,
      group_room_details: room.group_room_details || room.all_group_rooms,
      all_group_rooms: room.all_group_rooms,
      extensionSlotLabel: activeCalc?.extensionSlotLabel || room.extensionSlotLabel || null,
      extensionHours: activeCalc?.extensionHours || room.extension_hours || 0,
      extensionCharge: activeCalc?.extensionCharge || room.extension_charge || 0
    };
    const settlement = {
      settleAmt: room.final_settlement_payment || room.final_settle_amount || 0,
      refundAmt: room.refund_amount || 0,
      settled_at: room.actual_checkout_time || room.checkout_time || new Date(),
      discount_amount: activeCalc?.discountAmount ?? room.discount_amount ?? 0,
      discount_pct: activeCalc?.discountPct ?? room.discount_pct ?? 0,
      invoiceNo: room.invoice_no || formatTaxInvoiceNumber(room.voucher_number || room.voucher_no || room.checkin_voucher_no || room.id),
      checked_out_by: room.checked_out_by || cashierName
    };
    return { room, calc, settlement };
  };

  const handleSave = async () => {
    setIsProcessing(true);
    setProcessingMsg('Saving PDF to PC...');
    try {
      let ok = false;
      if (type === 'checkin') {
        ok = await downloadGuestRegistrationPDF(data, { includePhotos: false });
      } else if (type === 'summary') {
        ok = await downloadGuestPaymentSummaryPDF(data);
      } else if (type === 'activities') {
        ok = await downloadGuestActivitiesSummaryPDF(data);
      } else if (type === 'invoice') {
        const { room, calc, settlement } = getInvoiceParams(data);
        ok = await downloadFinalBillPDF(room, calc, settlement);
      } else if (type === 'cform') {
        ok = await downloadCFormPDF(data);
      } else {
        ok = await downloadGuestRegistrationPDF(data, { includePhotos: true });
      }
      if (ok) {
        showToast(`✓ ${getDocTitle(type).replace(/^[^\w]+/, '')} PDF saved to PC!`, 'green', 3500);
      }
      onClose();
    } catch (err) {
      console.error('Save PDF error:', err);
      showToast('Failed to save PDF: ' + err.message, 'red', 3500);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  const handlePrint = () => {
    try {
      if (type === 'checkin') {
        if (onReprintRegForm) {
          onReprintRegForm(data);
        } else {
          printGuestRegistrationA4(data, { includePhotos: false });
        }
      } else if (type === 'summary') {
        printGuestPaymentSummary(data);
      } else if (type === 'activities') {
        printGuestActivitiesSummary(data);
      } else if (type === 'invoice') {
        const { room, calc, settlement } = getInvoiceParams(data);
        printFinalBillA4(room, calc, settlement);
      } else if (type === 'cform') {
        printCForm(data);
      } else {
        printGuestRegistrationA4(data, { includePhotos: true });
      }
      onClose();
    } catch (err) {
      console.error('Print error:', err);
      showToast('Failed to open print preview: ' + err.message, 'red', 3000);
    }
  };

  const handleSaveAndPrint = async () => {
    setIsProcessing(true);
    setProcessingMsg('Saving PDF & opening print...');
    try {
      let ok = false;
      if (type === 'checkin') {
        ok = await downloadGuestRegistrationPDF(data, { includePhotos: false });
      } else if (type === 'summary') {
        ok = await downloadGuestPaymentSummaryPDF(data);
      } else if (type === 'activities') {
        ok = await downloadGuestActivitiesSummaryPDF(data);
      } else if (type === 'invoice') {
        const { room, calc, settlement } = getInvoiceParams(data);
        ok = await downloadFinalBillPDF(room, calc, settlement);
      } else if (type === 'cform') {
        ok = await downloadCFormPDF(data);
      } else {
        ok = await downloadGuestRegistrationPDF(data, { includePhotos: true });
      }
      if (ok) {
        showToast(`✓ PDF Saved! Opening print dialog...`, 'green', 2500);
      }
      setTimeout(() => {
        if (type === 'checkin') {
          if (onReprintRegForm) onReprintRegForm(data);
          else printGuestRegistrationA4(data, { includePhotos: false });
        } else if (type === 'summary') {
          printGuestPaymentSummary(data);
        } else if (type === 'activities') {
          printGuestActivitiesSummary(data);
        } else if (type === 'invoice') {
          const { room, calc, settlement } = getInvoiceParams(data);
          printFinalBillA4(room, calc, settlement);
        } else if (type === 'cform') {
          printCForm(data);
        } else {
          printGuestRegistrationA4(data, { includePhotos: true });
        }
        onClose();
      }, 400);
    } catch (err) {
      console.error('Save & Print error:', err);
      showToast('Error during Save & Print: ' + err.message, 'red', 3500);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 11000 }} onClick={onClose}>
      <div
        className="modal-container doc-action-modal-card"
        style={{
          maxWidth: '450px',
          width: '92%',
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '16px',
          padding: '20px 22px 18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color, #e2e8f0)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {isProcessing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              gap: '10px'
            }}
          >
            <div className="spinner" style={{ width: '34px', height: '34px', borderWidth: '3px' }}></div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e3a8a' }}>{processingMsg}</div>
          </div>
        )}

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-primary, #0f172a)' }}>
            {getDocTitle(type)}
          </h3>
          <button
            type="button"
            className="universal-close-btn"
            onClick={onClose}
            title="Close (Esc)"
            style={{ margin: 0 }}
          >
            &times;
          </button>
        </div>

        {/* 3 Simple Action Cards: Save, Print, Save & Print */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          {/* 1. Save */}
          <button
            type="button"
            className="doc-action-btn-tile doc-action-tile-save"
            onClick={handleSave}
            disabled={isProcessing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 6px',
              borderRadius: '12px',
              border: '1.5px solid #86efac',
              background: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ fontSize: '2.1rem', lineHeight: 1 }}>💾</span>
            <span style={{ fontWeight: 850, fontSize: '0.98rem', color: '#15803d' }}>Save</span>
          </button>

          {/* 2. Print */}
          <button
            type="button"
            className="doc-action-btn-tile doc-action-tile-print"
            onClick={handlePrint}
            disabled={isProcessing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 6px',
              borderRadius: '12px',
              border: '1.5px solid #93c5fd',
              background: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ fontSize: '2.1rem', lineHeight: 1 }}>🖨️</span>
            <span style={{ fontWeight: 850, fontSize: '0.98rem', color: '#1d4ed8' }}>Print</span>
          </button>

          {/* 3. Save & Print */}
          <button
            type="button"
            className="doc-action-btn-tile doc-action-tile-both"
            onClick={handleSaveAndPrint}
            disabled={isProcessing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 6px',
              borderRadius: '12px',
              border: '1.5px solid #d8b4fe',
              background: 'linear-gradient(145deg, #faf5ff 0%, #f3e8ff 100%)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ fontSize: '2.1rem', lineHeight: 1 }}>⚡</span>
            <span style={{ fontWeight: 850, fontSize: '0.92rem', color: '#6d28d9', textAlign: 'center', whiteSpace: 'nowrap' }}>
              Save &amp; Print
            </span>
          </button>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '12px' }}>
          <button
            type="button"
            className="btn-custom-cancel"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: '7px 18px', fontSize: '0.84rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
