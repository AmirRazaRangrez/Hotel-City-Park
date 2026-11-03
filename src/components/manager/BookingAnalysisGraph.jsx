import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import ThemedDatePicker from '../common/ThemedDatePicker';
import { formatCurrency } from '../../utils/formatters';

const OTA_CHANNELS = [
  { id: 'all', label: 'All Channels (OTA + Direct)' },
  { id: 'all_ota', label: 'All OTAs Combined' },
  { id: 'MakeMyTrip', label: 'MakeMyTrip' },
  { id: 'Booking.com', label: 'Booking.com' },
  { id: 'Agoda', label: 'Agoda' },
  { id: 'Goibibo', label: 'Goibibo' },
  { id: 'Airbnb', label: 'Airbnb' },
  { id: 'EaseMyTrip', label: 'EaseMyTrip' },
  { id: 'Yatra', label: 'Yatra' },
  { id: 'Expedia', label: 'Expedia' },
  { id: 'Walk-in', label: 'Walk-in (Front Desk)' },
  { id: 'BTC', label: 'BTC Corporate' }
];

export default function BookingAnalysisGraph() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Default to last 14 days
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const fetchData = useCallback(async (start, end, platform) => {
    setIsLoading(true);
    try {
      const res = await api.getBookingAnalysis({
        startDate: start,
        endDate: end,
        otaPlatform: platform
      });
      if (res && res.success) {
        setAnalysisData(res);
      }
    } catch (err) {
      console.warn('Error fetching booking analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(fromDate, toDate, selectedPlatform);
  }, [fromDate, toDate, selectedPlatform, fetchData]);

  // Construct complete continuous daily series between fromDate and toDate
  const chartSeries = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const map = {};
    (analysisData?.dailyRecords || []).forEach(r => {
      map[r.date] = r;
    });

    const series = [];
    const curr = new Date(fromDate);
    const end = new Date(toDate);

    // Limit to max 60 days to prevent chart overflow
    let daysCount = 0;
    while (curr <= end && daysCount < 60) {
      const dStr = curr.toISOString().slice(0, 10);
      const rec = map[dStr] || { date: dStr, booking_count: 0, rooms_count: 0, total_revenue: 0 };
      series.push(rec);
      curr.setDate(curr.getDate() + 1);
      daysCount++;
    }
    return series;
  }, [fromDate, toDate, analysisData]);

  // Max value for Y-axis scaling
  const maxBookings = useMemo(() => {
    const maxVal = Math.max(...chartSeries.map(s => Number(s.booking_count || 0)), 1);
    return Math.max(maxVal, 5); // At least 5 for nice gridlines
  }, [chartSeries]);

  const summary = analysisData?.summary || { totalBookings: 0, totalRooms: 0, totalRevenue: 0, adr: 0 };
  const channels = analysisData?.channelDistribution || [];

  const handlePreset = (type) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (type === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (type === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (type === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (type === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (type === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(todayStr);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #e2e8f0',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
      }}
    >
      {/* Header and Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 850, color: '#0f172a' }}>
              Booking Analysis &amp; OTA Channel Performance
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Interactive time-series analysis graph filtered date-to-date with OTA booking platform breakdowns.
          </p>
        </div>

        {/* Date Filter & OTA Channel Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569' }}>From:</span>
            <div style={{ width: '140px' }}>
              <ThemedDatePicker
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ height: '34px', fontSize: '0.82rem', fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569' }}>To:</span>
            <div style={{ width: '140px' }}>
              <ThemedDatePicker
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ height: '34px', fontSize: '0.82rem', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handlePreset('today')}
              style={{ padding: '0 9px', height: '34px', fontSize: '0.78rem', fontWeight: 750 }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handlePreset('7days')}
              style={{ padding: '0 9px', height: '34px', fontSize: '0.78rem', fontWeight: 750 }}
            >
              7 Days
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handlePreset('30days')}
              style={{ padding: '0 9px', height: '34px', fontSize: '0.78rem', fontWeight: 750 }}
            >
              30 Days
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handlePreset('month')}
              style={{ padding: '0 9px', height: '34px', fontSize: '0.78rem', fontWeight: 750 }}
            >
              Month
            </button>
          </div>

          {/* Channel / OTA Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0284c7' }}>Platform:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="form-input form-input-sm"
              style={{
                height: '34px',
                padding: '0 10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
                border: '1.5px solid #0284c7',
                borderRadius: '8px',
                background: '#f0f9ff',
                cursor: 'pointer'
              }}
            >
              {OTA_CHANNELS.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}
      >
        <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Total Bookings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
            {summary.totalBookings}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            Across {chartSeries.length} calendar days
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Total Rooms Booked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {summary.totalRooms}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            Individual room allocations
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Total Room Revenue
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            Gross tariff from filtered bookings
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Avg. Room Rate (ADR)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
            {formatCurrency(summary.adr)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            Average revenue per room
          </div>
        </div>
      </div>

      {/* Interactive Time Series SVG Graph */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#1e293b' }}>
            📅 Daily Bookings Trend &amp; Volume ({fromDate} to {toDate})
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(180deg, #38bdf8, #0284c7)' }} />
              Bookings Count
            </span>
          </div>
        </div>

        {/* SVG Graph Canvas */}
        <div
          style={{
            background: '#fafafa',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px 14px 10px',
            overflowX: 'auto',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'flex-end',
            position: 'relative'
          }}
        >
          {isLoading ? (
            <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
              ⏳ Loading analytics graph...
            </div>
          ) : chartSeries.length === 0 ? (
            <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>
              No bookings recorded in this date range.
            </div>
          ) : (
            <div style={{ width: '100%', minWidth: `${Math.max(chartSeries.length * 48, 500)}px`, height: '220px', position: 'relative' }}>
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const val = Math.round(maxBookings * (1 - pct));
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      top: `${pct * 170}px`,
                      left: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      pointerEvents: 'none'
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', width: '22px', textAlign: 'right' }}>
                      {val}
                    </span>
                    <div style={{ flex: 1, borderBottom: '1px dashed #e2e8f0' }} />
                  </div>
                );
              })}

              {/* Bars Row */}
              <div
                style={{
                  position: 'absolute',
                  left: '32px',
                  right: 0,
                  bottom: '24px',
                  height: '170px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  gap: '6px'
                }}
              >
                {chartSeries.map((item, idx) => {
                  const count = Number(item.booking_count || 0);
                  const barHeightPct = Math.max((count / maxBookings) * 100, count > 0 ? 8 : 2);
                  const isHovered = hoveredBar?.date === item.date;
                  const dateLabel = new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredBar(item)}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{
                        flex: 1,
                        maxWidth: '42px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Count Badge on top of Bar */}
                      {count > 0 && (
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 900,
                            color: isHovered ? '#0284c7' : '#475569',
                            marginBottom: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {count}
                        </span>
                      )}

                      {/* Bar Fill */}
                      <div
                        style={{
                          width: '100%',
                          height: `${barHeightPct}%`,
                          borderRadius: '6px 6px 2px 2px',
                          background: isHovered
                            ? 'linear-gradient(180deg, #0284c7, #0369a1)'
                            : count > 0
                            ? 'linear-gradient(180deg, #38bdf8, #0284c7)'
                            : '#e2e8f0',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isHovered ? '0 4px 12px rgba(2,132,199,0.4)' : 'none',
                          transform: isHovered ? 'scaleY(1.04)' : 'none',
                          transformOrigin: 'bottom'
                        }}
                      />

                      {/* X-axis Date Label */}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-22px',
                          fontSize: '0.66rem',
                          fontWeight: isHovered ? 900 : 700,
                          color: isHovered ? '#0284c7' : '#64748b',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hover Tooltip Card */}
        {hoveredBar && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '20px',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.80rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
              zIndex: 10,
              pointerEvents: 'none',
              minWidth: '170px'
            }}
          >
            <div style={{ fontWeight: 850, borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '6px', color: '#38bdf8' }}>
              📅 {new Date(hoveredBar.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>Bookings:</span>
              <strong style={{ color: '#fff' }}>{hoveredBar.booking_count}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>Rooms:</span>
              <strong style={{ color: '#fff' }}>{hoveredBar.rooms_count}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>Revenue:</span>
              <strong style={{ color: '#4ade80' }}>{formatCurrency(hoveredBar.total_revenue)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* OTA Channel Distribution Breakdown */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#1e293b', marginBottom: '12px' }}>
          🏨 Booking Channels &amp; Platform Distribution ({fromDate} to {toDate})
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {channels.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No channel data available.</div>
          ) : (
            channels.map((ch, idx) => {
              const isSelected = selectedPlatform === ch.channel || (selectedPlatform === 'all_ota' && (ch.booking_source === 'OTA' || ch.ota_platform));
              const pct = summary.totalBookings > 0 ? Math.round((ch.booking_count / summary.totalBookings) * 100) : 0;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedPlatform(ch.channel)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f9ff' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Click to filter by ${ch.channel}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.86rem', color: isSelected ? '#0284c7' : '#0f172a' }}>
                      {ch.channel}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: isSelected ? '#0284c7' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569'
                      }}
                    >
                      {pct}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                    <span>Bookings: <strong>{ch.booking_count}</strong></span>
                    <span>Rooms: <strong>{ch.rooms_count}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#16a34a', marginTop: '4px', fontWeight: 800 }}>
                    <span>Revenue:</span>
                    <span>{formatCurrency(ch.total_revenue)}</span>
                  </div>

                  {/* Proportional Progress Bar */}
                  <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isSelected ? '#0284c7' : '#38bdf8' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Collapsible Bookings List View */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
        <button
          type="button"
          onClick={() => setShowTable(prev => !prev)}
          className="btn-secondary"
          style={{ fontSize: '0.80rem', fontWeight: 750, padding: '6px 14px', borderRadius: '8px' }}
        >
          {showTable ? '▲ Hide Filtered Bookings Table' : `▼ View Bookings Table (${analysisData?.bookingsList?.length || 0})`}
        </button>

        {showTable && (
          <div style={{ marginTop: '14px', overflowX: 'auto' }}>
            <table className="pos-table" style={{ width: '100%', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px' }}>Voucher #</th>
                  <th style={{ padding: '8px 10px' }}>Room</th>
                  <th style={{ padding: '8px 10px' }}>Guest Name</th>
                  <th style={{ padding: '8px 10px' }}>Channel / OTA</th>
                  <th style={{ padding: '8px 10px' }}>Check-in</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Charge</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {(analysisData?.bookingsList || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                      No bookings found for the selected date range and platform.
                    </td>
                  </tr>
                ) : (
                  analysisData.bookingsList.map((bk, i) => (
                    <tr key={bk.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, fontFamily: 'monospace' }}>
                        {bk.voucher_number || `#${bk.id}`}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0284c7' }}>
                        {bk.room_number ? `#${bk.room_number}` : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                        {bk.guest_name || 'Guest'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: bk.booking_source === 'OTA' ? '#fef3c7' : '#e0f2fe',
                            color: bk.booking_source === 'OTA' ? '#92400e' : '#0369a1'
                          }}
                        >
                          {bk.ota_platform || bk.booking_source || 'Direct'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                        {bk.checkin_time ? bk.checkin_time.slice(0, 16).replace('T', ' ') : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        {formatCurrency(bk.total_room_charge)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: bk.payment_status === 'settled' ? '#dcfce7' : '#fef9c3',
                            color: bk.payment_status === 'settled' ? '#166534' : '#854d0e'
                          }}
                        >
                          {bk.payment_status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

