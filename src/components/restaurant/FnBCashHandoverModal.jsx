import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { printFnBCashHandover } from '../../services/printService';
import ThemedDatePicker from '../common/ThemedDatePicker';
import ThemedSelect from '../common/ThemedSelect';
import { numberToWordsINR } from '../../utils/numberToWords';

const SHIFT_OPTIONS = [
  { value: '7am-7pm', label: '7:00 AM - 7:00 PM (Day Shift)' },
  { value: '7pm-7am', label: '7:00 PM - 7:00 AM (Night Shift)' },
  { value: '7am-3pm', label: '7:00 AM - 3:00 PM (Morning Shift)' },
  { value: '3pm-11pm', label: '3:00 PM - 11:00 PM (Evening Shift)' },
  { value: '11pm-7am', label: '11:00 PM - 7:00 AM (Night Shift)' },
  { value: 'all', label: 'All Day (Full 24 Hours)' },
  { value: 'custom', label: 'Custom Time Range...' }
];

const HIST_SHIFT_OPTIONS = [
  { value: 'all', label: 'All Shifts (Day & Night)' },
  { value: '7am-7pm', label: 'Day Shift (7:00 AM - 7:00 PM)' },
  { value: '7pm-7am', label: 'Night Shift (7:00 PM - 7:00 AM)' },
  { value: '7am-3pm', label: 'Morning Shift (7:00 AM - 3:00 PM)' },
  { value: '3pm-11pm', label: 'Evening Shift (3:00 PM - 11:00 PM)' },
  { value: '11pm-7am', label: 'Night Shift (11:00 PM - 7:00 AM)' }
];

export default function FnBCashHandoverModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('statement'); // 'statement' | 'history'
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('all');
  const [fromTime, setFromTime] = useState('07:00');
  const [toTime, setToTime] = useState('19:00');
  const [staffName, setStaffName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [handoverData, setHandoverData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // 1-Week / Date Range History State
  const [histStartDate, setHistStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [histEndDate, setHistEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [histShift, setHistShift] = useState('all');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const name = currentUser?.full_name || currentUser?.name || currentUser?.username || 'F&B Cashier';
      setStaffName(name);
    }
  }, [isOpen, currentUser]);

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = { date, shift };
      if (shift === 'custom') {
        params.fromTime = fromTime;
        params.toTime = toTime;
        params.toDate = toDate;
      }
      const res = await api.getFnbCashHandoverData(params);
      if (res && res.success) {
        setHandoverData(res);
      } else {
        setErrorMsg(res?.error || 'Failed to fetch F&B cash handover records.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server error loading F&B handover records.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, date, shift, fromTime, toTime, toDate]);

  const loadHistory = useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const res = await api.getFnbCashHandoverHistory({
        startDate: histStartDate,
        endDate: histEndDate,
        shift: histShift
      });
      if (res && res.success && Array.isArray(res.records)) {
        setHistoryRecords(res.records);
      } else {
        setHistoryError(res?.error || 'Failed to fetch F&B shift handover history.');
      }
    } catch (err) {
      setHistoryError(err.message || 'Server error loading F&B handover history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isOpen, histStartDate, histEndDate, histShift]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'statement') {
        loadData();
      } else if (activeTab === 'history') {
        loadHistory();
      }
    }
  }, [isOpen, activeTab, loadData, loadHistory]);

  if (!isOpen) return null;

  const fnbCashSales = Number(handoverData?.fnbCashSales || 0);
  const fnbDeposits = Number(handoverData?.fnbDeposits || 0);
  const toHandoverA = Number(handoverData?.toHandoverA || (fnbCashSales + fnbDeposits));
  const fbFromReception = Number(handoverData?.fbFromReception || 0);
  const netHandover = Number(handoverData?.netHandover !== undefined ? handoverData.netHandover : toHandoverA);
  const amountWords = numberToWordsINR(netHandover);

  const handlePrint = () => {
    if (!handoverData) return;
    const now = new Date();
    const dayName = now.toLocaleDateString('en-IN', { weekday: 'long' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    printFnBCashHandover(handoverData, {
      staffName: staffName.trim() || 'F&B Cashier',
      dayName,
      timeStr,
      dateStr: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    });
  };

  const handleSelectHistoryRecord = (rec) => {
    setDate(rec.date);
    setShift(rec.shiftKey || '7am-7pm');
    setActiveTab('statement');
  };

  const setPresetRange = (days) => {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      setHistStartDate(start.toISOString().slice(0, 10));
      setHistEndDate(end.toISOString().slice(0, 10));
    } else if (days === 1) {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      setHistStartDate(start.toISOString().slice(0, 10));
      setHistEndDate(end.toISOString().slice(0, 10));
    } else {
      start.setDate(start.getDate() - (days - 1));
      setHistStartDate(start.toISOString().slice(0, 10));
      setHistEndDate(end.toISOString().slice(0, 10));
    }
  };

  // Aggregates for history
  const totalHistNet = historyRecords.reduce((sum, r) => sum + Number(r.netHandover || 0), 0);
  const totalHistSales = historyRecords.reduce((sum, r) => sum + Number(r.fnbCashSales || 0), 0);
  const totalHistDeposits = historyRecords.reduce((sum, r) => sum + Number(r.fnbDeposits || 0), 0);
  const totalHistReception = historyRecords.reduce((sum, r) => sum + Number(r.fbFromReception || 0), 0);

  return (
    <div className="modal-backdrop active" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="modal-card"
        style={{
          width: '95%',
          maxWidth: '860px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          background: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #7c2d12, #451a03)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #78350f'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🍽️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fef3c7' }}>
                F&B Cash Handover Statement
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#fed7aa' }}>
                Restaurant & Bar Cash Audit & 1-Week Audit History • Prints 2 exact copies on single A4 sheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 800,
              transition: 'all 0.15s ease'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* View Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#fffbeb',
            borderBottom: '1.5px solid #fde68a',
            padding: '0 16px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'statement' ? 850 : 650,
              color: activeTab === 'statement' ? '#78350f' : '#92400e',
              borderBottom: activeTab === 'statement' ? '3px solid #b45309' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📋</span> Current Shift Statement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'history' ? 850 : 650,
              color: activeTab === 'history' ? '#78350f' : '#92400e',
              borderBottom: activeTab === 'history' ? '3px solid #b45309' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📜</span> Shift Records (1-Week / History)
          </button>
        </div>

        {/* Tab 1: Current Shift Statement */}
        {activeTab === 'statement' && (
          <>
            {/* Filter Controls Toolbar */}
            <div
              style={{
                padding: '12px 20px',
                background: '#fffdfa',
                borderBottom: '1.5px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>Date:</span>
                <div style={{ width: '155px' }}>
                  <ThemedDatePicker
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ height: '34px', fontSize: '0.82rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Whole Day Quick Select Button (Default Selected) */}
              <button
                type="button"
                id="btn-fnb-shift-whole-day"
                onClick={() => setShift('all')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: shift === 'all' ? '1.5px solid #d97706' : '1.5px solid #cbd5e1',
                  background: shift === 'all' ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : '#ffffff',
                  color: shift === 'all' ? '#ffffff' : '#334155',
                  boxShadow: shift === 'all' ? '0 2px 6px rgba(217, 119, 6, 0.25)' : 'none'
                }}
                title="Whole Day (12:00 AM to 11:59 PM - All 24 Hours)"
              >
                <span>☀️</span>
                <span>Whole Day</span>
                {shift === 'all' && <span style={{ fontSize: '0.74rem', marginLeft: '2px' }}>✓</span>}
              </button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>Shift:</span>
                <div style={{ width: '250px' }}>
                  <ThemedSelect
                    value={shift}
                    onChange={(val) => setShift(val)}
                    options={SHIFT_OPTIONS}
                    colorTheme="amber"
                    style={{ height: '34px', fontSize: '0.82rem', fontWeight: 650 }}
                  />
                </div>
              </div>

              {shift === 'custom' && (
                <>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#92400e' }}>From:</span>
                    <input
                      type="time"
                      value={fromTime}
                      onChange={(e) => setFromTime(e.target.value)}
                      className="form-input form-input-sm"
                      style={{ height: '34px', width: '105px', fontSize: '0.82rem', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#92400e' }}>To:</span>
                    <input
                      type="time"
                      value={toTime}
                      onChange={(e) => setToTime(e.target.value)}
                      className="form-input form-input-sm"
                      style={{ height: '34px', width: '105px', fontSize: '0.82rem', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#92400e' }}>To Date:</span>
                    <div style={{ width: '145px' }}>
                      <ThemedDatePicker
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ height: '34px', fontSize: '0.80rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={loadData}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px' }}
              >
                <span>🔄</span> Refresh
              </button>
            </div>

            {/* Modal Body / Statement Preview */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
                  <p style={{ fontWeight: 600 }}>Calculating F&B shift cash collections...</p>
                </div>
              ) : errorMsg ? (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#991b1b', textAlign: 'center' }}>
                  ⚠️ {errorMsg}
                </div>
              ) : handoverData ? (
                <div>
                  {/* Paper Statement Box */}
                  <div
                    style={{
                      border: '1.5px solid #0f172a',
                      borderRadius: '10px',
                      background: '#ffffff',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Statement Top Info */}
                    <div style={{ padding: '12px 16px', borderBottom: '1.5px solid #0f172a', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                          HOTEL CITY PAARK
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                          119, Murarji Peth, Char Hutatma Chowk, Solapur - 413 001.
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.76rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.35 }}>
                        <div>SHIFT: <span style={{ color: '#d97706' }}>{handoverData.shift}</span></div>
                        <div>DATE: <span>{new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div>
                        <div style={{ whiteSpace: 'nowrap' }}>STAFF: <span style={{ textTransform: 'uppercase', color: '#b45309', fontWeight: 900 }}>{staffName}</span></div>
                      </div>
                    </div>

                    {/* Statement Content Table: REFUND REMOVED & NET HANDOVER ALIGNED WITH TO HANDOVER */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #0f172a' }}>
                          <th style={{ width: '36%', padding: '8px 12px', textAlign: 'left', borderRight: '1px solid #cbd5e1', fontWeight: 800 }}>RECEIPTS</th>
                          <th style={{ width: '14%', padding: '8px 12px', textAlign: 'right', borderRight: '1.5px solid #0f172a', fontWeight: 800 }}>AMOUNT</th>
                          <th style={{ width: '36%', padding: '8px 12px', textAlign: 'left', borderRight: '1px solid #cbd5e1', fontWeight: 800 }}>DETAILS OF CASH HANDOVER</th>
                          <th style={{ width: '14%', padding: '8px 12px', textAlign: 'right', fontWeight: 800 }}>AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: A. F&B | Total Cash Receipts Rs. */}
                        <tr style={{ background: '#fdfdfe' }}>
                          <td style={{ padding: '6px 12px', fontWeight: 800, borderRight: '1px solid #cbd5e1', color: '#0f172a' }}>
                            A. F&B
                          </td>
                          <td style={{ padding: '6px 12px', borderRight: '1.5px solid #0f172a' }}></td>
                          <td style={{ padding: '6px 12px', fontWeight: 800, borderRight: '1px solid #cbd5e1' }}>
                            Total Cash Receipts Rs.
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 850, color: '#0f172a' }}>
                            ₹ {toHandoverA.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Row 2: 1) F&B Cash Sales | (blank - refund removed) */}
                        <tr>
                          <td style={{ padding: '5px 12px', paddingLeft: '24px', borderRight: '1px solid #cbd5e1' }}>
                            1) F&B Cash Sales
                          </td>
                          <td style={{ padding: '5px 12px', textAlign: 'right', borderRight: '1.5px solid #0f172a', fontWeight: 700 }}>
                            ₹ {fnbCashSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '5px 12px', borderRight: '1px solid #cbd5e1' }} colSpan={2}></td>
                        </tr>

                        {/* Row 3: 2) F&B Deposits | (blank - refund removed) */}
                        <tr>
                          <td style={{ padding: '5px 12px', paddingLeft: '24px', borderRight: '1px solid #cbd5e1' }}>
                            2) F&B Deposits
                          </td>
                          <td style={{ padding: '5px 12px', textAlign: 'right', borderRight: '1.5px solid #0f172a', fontWeight: 700 }}>
                            ₹ {fnbDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '5px 12px', borderRight: '1px solid #cbd5e1' }} colSpan={2}></td>
                        </tr>

                        {/* Row 4: To Handover Rs. (LEFT) | Net Handover to A/c.'s Rs. (RIGHT - EXACT EQUAL LEVEL) */}
                        <tr style={{ borderTop: '1.5px solid #0f172a', borderBottom: '1.5px solid #0f172a', background: '#f8fafc' }}>
                          <td style={{ padding: '7px 12px', fontWeight: 900, borderRight: '1px solid #cbd5e1', color: '#0f172a' }}>
                            To Handover Rs.
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 950, borderRight: '1.5px solid #0f172a', color: '#0f172a' }}>
                            ₹ {toHandoverA.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '7px 12px', fontWeight: 900, borderRight: '1px solid #cbd5e1', background: '#f0fdf4', color: '#166534' }}>
                            Net Handover to A/c.'s Rs.
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 950, background: '#f0fdf4', color: '#166534', fontSize: '0.96rem' }}>
                            ₹ {netHandover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Row 5: B. To Collect From Reception :- */}
                        <tr>
                          <td style={{ padding: '6px 12px', fontWeight: 800, borderRight: '1px solid #cbd5e1', color: '#2563eb' }}>
                            B. To Collect From Reception :-
                          </td>
                          <td style={{ padding: '6px 12px', borderRight: '1.5px solid #0f172a' }}></td>
                          <td style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1' }} colSpan={2}></td>
                        </tr>

                        {/* Row 6: Total F&B Cash from Reception */}
                        <tr>
                          <td style={{ padding: '5px 12px', paddingLeft: '24px', borderRight: '1px solid #cbd5e1' }}>
                            Total F&B Cash from Reception
                          </td>
                          <td style={{ padding: '5px 12px', textAlign: 'right', borderRight: '1.5px solid #0f172a', fontWeight: 800, color: '#2563eb' }}>
                            ₹ {fbFromReception.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '5px 12px', borderRight: '1px solid #cbd5e1' }} colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Footer Strip */}
                    <div style={{ padding: '14px 16px', background: '#fafafa', borderTop: '1.5px solid #0f172a' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                        Total Rs. : <span style={{ color: '#059669', fontSize: '1.08rem' }}>₹ {netHandover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155', marginTop: '2px', fontStyle: 'italic' }}>
                        Total in Words : {amountWords}
                      </div>

                      {/* Signatures Section with Generous Top Margin for comfortable hand-signing */}
                      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.78rem', fontWeight: 750, color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            Signature of Paying Cashier: <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>[{staffName}]</strong> _____________________
                          </div>
                          <div>
                            Sign of Receiving Cashier: _____________________
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <div>
                            Sign of Accountant: _____________________
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Detailed Transactions Button */}
                  <div style={{ marginTop: '14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowBreakdown((prev) => !prev)}
                      style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '8px' }}
                    >
                      {showBreakdown ? '▲ Hide Cash Order Breakdowns' : '▼ View Detailed Cash Orders'}
                    </button>
                  </div>

                  {showBreakdown && handoverData.breakdowns && (
                    <div style={{ marginTop: '10px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                      <h5 style={{ margin: '0 0 6px', fontWeight: 800, color: '#1e293b' }}>F&B Cash Orders ({handoverData.breakdowns.fnbCashRows?.length || 0}):</h5>
                      {!handoverData.breakdowns.fnbCashRows || handoverData.breakdowns.fnbCashRows.length === 0 ? (
                        <p style={{ color: '#94a3b8', margin: '0 0 10px' }}>No direct F&B cash orders in this shift.</p>
                      ) : (
                        <ul style={{ margin: '0 0 10px', paddingLeft: '18px' }}>
                          {handoverData.breakdowns.fnbCashRows.map((r) => (
                            <li key={r.id}>
                              <strong>₹{(r.split_cash || r.amount).toLocaleString('en-IN')}</strong> — {r.table_number ? `Table #${r.table_number}` : 'Takeaway'} ({r.customer_name || 'Walk-in'}) · Order #{r.order_number || r.id} · Time: {r.created_at}
                            </li>
                          ))}
                        </ul>
                      )}

                      {handoverData.breakdowns.fnbRoomFolioRows && handoverData.breakdowns.fnbRoomFolioRows.length > 0 && (
                        <>
                          <h5 style={{ margin: '6px 0', fontWeight: 800, color: '#2563eb' }}>Settled via Reception Checkout ({handoverData.breakdowns.fnbRoomFolioRows.length}):</h5>
                          <ul style={{ margin: 0, paddingLeft: '18px' }}>
                            {handoverData.breakdowns.fnbRoomFolioRows.map((f, i) => (
                              <li key={i}>
                                <strong>₹{f.fnbCashPortion.toLocaleString('en-IN')}</strong> — Room #{f.room_number} ({f.guest_name}) · Vch: {f.voucher_number}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Action Footer */}
            <div
              style={{
                padding: '14px 20px',
                background: '#fffdfa',
                borderTop: '1.5px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: '0.80rem', color: '#92400e' }}>
                Prints <strong>2 copies on 1 A4 sheet</strong> (F&B Copy + Accounts Copy).
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 650 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePrint}
                  disabled={isLoading || !handoverData}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '8px',
                    fontWeight: 750,
                    background: '#ea580c',
                    borderColor: '#c2410c',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
                  }}
                >
                  <span>🖨️</span> Print F&B Statement (2 Copies A4)
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: 1-Week / Shift History Records */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* History Filter Toolbar */}
            <div
              style={{
                padding: '12px 20px',
                background: '#fffdfa',
                borderBottom: '1.5px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#92400e' }}>From Date:</span>
                <div style={{ width: '150px' }}>
                  <ThemedDatePicker
                    value={histStartDate}
                    onChange={(e) => setHistStartDate(e.target.value)}
                    style={{ height: '34px', fontSize: '0.80rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#92400e' }}>To Date:</span>
                <div style={{ width: '150px' }}>
                  <ThemedDatePicker
                    value={histEndDate}
                    onChange={(e) => setHistEndDate(e.target.value)}
                    style={{ height: '34px', fontSize: '0.80rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#92400e' }}>Shift:</span>
                <div style={{ width: '220px' }}>
                  <ThemedSelect
                    value={histShift}
                    onChange={(val) => setHistShift(val)}
                    options={HIST_SHIFT_OPTIONS}
                    colorTheme="amber"
                    style={{ height: '34px', fontSize: '0.80rem', fontWeight: 650 }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={loadHistory}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px' }}
              >
                <span>🔄</span> Fetch Records
              </button>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPresetRange(7)}
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPresetRange(0)}
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPresetRange(1)}
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPresetRange(14)}
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '6px' }}
                >
                  14 Days
                </button>
              </div>
            </div>

            {/* Aggregates Summary Banner */}
            <div
              style={{
                padding: '10px 20px',
                background: '#fffbeb',
                borderBottom: '1px solid #fde68a',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '0.80rem',
                fontWeight: 750
              }}
            >
              <div>
                Total Net Handover: <strong style={{ color: '#b45309', fontSize: '0.90rem' }}>₹{totalHistNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                F&B Direct Cash: <strong style={{ color: '#0f172a' }}>₹{totalHistSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                F&B Deposits: <strong style={{ color: '#0f172a' }}>₹{totalHistDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div>
                From Reception: <strong style={{ color: '#2563eb' }}>₹{totalHistReception.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ marginLeft: 'auto', color: '#92400e' }}>
                Shifts Logged: <strong>{historyRecords.length}</strong>
              </div>
            </div>

            {/* History Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {isLoadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>⏳</div>
                  <p style={{ fontWeight: 600 }}>Loading 1-week F&B shift handover records...</p>
                </div>
              ) : historyError ? (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#991b1b', textAlign: 'center' }}>
                  ⚠️ {historyError}
                </div>
              ) : historyRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  No F&B shift records found for selected date range.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', border: '1px solid #fed7aa', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#fffbeb', borderBottom: '1.5px solid #fde68a', textAlign: 'left', fontWeight: 800, color: '#78350f' }}>
                      <th style={{ padding: '8px 10px' }}>Date</th>
                      <th style={{ padding: '8px 10px' }}>Shift</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>F&B Cash Sales</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>F&B Deposits</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>From Reception</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Net Handover</th>
                      <th style={{ padding: '8px 10px' }}>Cashier(s)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((r, idx) => (
                      <tr
                        key={`${r.date}-${r.shiftKey}-${idx}`}
                        style={{
                          borderBottom: '1px solid #fde68a',
                          background: idx % 2 === 0 ? '#ffffff' : '#fffdfa'
                        }}
                      >
                        <td style={{ padding: '7px 10px', fontWeight: 750, color: '#0f172a' }}>
                          {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          <div style={{ fontSize: '0.70rem', color: '#92400e' }}>
                            {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                          </div>
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 650, color: '#b45309' }}>
                          {r.shiftLabel}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{Number(r.fnbCashSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{Number(r.fnbDeposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                          ₹{Number(r.fbFromReception || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 850, color: '#166534', fontSize: '0.85rem' }}>
                          ₹{Number(r.netHandover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#78350f', fontSize: '0.74rem' }}>
                          {r.cashiers && r.cashiers.length > 0 ? r.cashiers.join(', ') : '-'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleSelectHistoryRecord(r)}
                            style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
                            title="View and Print Statement for this shift"
                          >
                            👁️ View / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* History Footer */}
            <div
              style={{
                padding: '12px 20px',
                background: '#fffdfa',
                borderTop: '1.5px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: '0.80rem', color: '#92400e' }}>
                Showing <strong>{historyRecords.length}</strong> F&B shift records from <strong>{histStartDate}</strong> to <strong>{histEndDate}</strong>.
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ padding: '6px 16px', borderRadius: '8px', fontWeight: 650 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
