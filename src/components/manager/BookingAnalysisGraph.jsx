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
    d.setDate(d.getDate() - 7); // Default to last 7 days (Week)
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activePreset, setActivePreset] = useState('week');
  const [fromBillNo, setFromBillNo] = useState('');
  const [toBillNo, setToBillNo] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const fetchData = useCallback(async (start, end, platform, fBill = fromBillNo, tBill = toBillNo) => {
    setIsLoading(true);
    try {
      const params = {
        startDate: start,
        endDate: end,
        otaPlatform: platform
      };
      if (fBill && fBill.trim()) params.fromBillNo = fBill.trim();
      if (tBill && tBill.trim()) params.toBillNo = tBill.trim();

      const res = await api.getBookingAnalysis(params);
      if (res && res.success) {
        setAnalysisData(res);
      }
    } catch (err) {
      console.warn('Error fetching booking analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fromBillNo, toBillNo]);

  useEffect(() => {
    fetchData(fromDate, toDate, selectedPlatform, fromBillNo, toBillNo);
  }, [fromDate, toDate, selectedPlatform, fetchData]);

  // Construct complete continuous series adapted to Day, Week, Month, Year
  const chartSeries = useMemo(() => {
    if (!fromDate || !toDate) return [];

    // Case 1: Intra-day hourly breakdown when fromDate === toDate (e.g. Day preset)
    if (fromDate === toDate) {
      const timeSlots = [
        { label: '00:00 - 04:00', startH: 0, endH: 4 },
        { label: '04:00 - 08:00', startH: 4, endH: 8 },
        { label: '08:00 - 12:00', startH: 8, endH: 12 },
        { label: '12:00 - 16:00', startH: 12, endH: 16 },
        { label: '16:00 - 20:00', startH: 16, endH: 20 },
        { label: '20:00 - 24:00', startH: 20, endH: 24 }
      ];

      const slots = timeSlots.map(slot => ({
        label: slot.label,
        date: fromDate,
        booking_count: 0,
        rooms_count: 0,
        total_revenue: 0
      }));

      (analysisData?.bookingsList || []).forEach(b => {
        const timeStr = b.checkin_time || b.created_at;
        let hour = 12; // default midday
        if (timeStr) {
          const d = new Date(timeStr);
          if (!isNaN(d.getTime())) {
            hour = d.getHours();
          }
        }
        const slotIdx = Math.min(Math.floor(hour / 4), 5);
        slots[slotIdx].booking_count += 1;
        slots[slotIdx].rooms_count += 1;
        slots[slotIdx].total_revenue += Number(b.total_room_charge || 0);
      });

      return slots;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Case 2: Multi-month / Year view (> 60 days): aggregate by month
    if (diffDays > 60) {
      const monthMap = {};
      (analysisData?.dailyRecords || []).forEach(r => {
        const mKey = r.date.slice(0, 7); // YYYY-MM
        if (!monthMap[mKey]) {
          monthMap[mKey] = {
            mKey,
            booking_count: 0,
            rooms_count: 0,
            total_revenue: 0
          };
        }
        monthMap[mKey].booking_count += Number(r.booking_count || 0);
        monthMap[mKey].rooms_count += Number(r.rooms_count || 0);
        monthMap[mKey].total_revenue += Number(r.total_revenue || 0);
      });

      const series = [];
      const currM = new Date(start.getFullYear(), start.getMonth(), 1);
      const endM = new Date(end.getFullYear(), end.getMonth(), 1);

      while (currM <= endM && series.length < 24) {
        const mKey = currM.toISOString().slice(0, 7);
        const monthName = currM.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        const rec = monthMap[mKey] || { booking_count: 0, rooms_count: 0, total_revenue: 0 };
        series.push({
          label: monthName,
          date: mKey,
          booking_count: rec.booking_count,
          rooms_count: rec.rooms_count,
          total_revenue: rec.total_revenue
        });
        currM.setMonth(currM.getMonth() + 1);
      }
      return series;
    }

    // Case 3: Daily view (1 to 60 days, e.g. Week, Month)
    const map = {};
    (analysisData?.dailyRecords || []).forEach(r => {
      map[r.date] = r;
    });

    const series = [];
    const curr = new Date(fromDate);
    let daysCount = 0;
    while (curr <= end && daysCount < 60) {
      const dStr = curr.toISOString().slice(0, 10);
      const rec = map[dStr] || { date: dStr, booking_count: 0, rooms_count: 0, total_revenue: 0 };
      const dateLabel = curr.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      series.push({
        label: dateLabel,
        date: dStr,
        booking_count: Number(rec.booking_count || 0),
        rooms_count: Number(rec.rooms_count || 0),
        total_revenue: Number(rec.total_revenue || 0)
      });
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
    setActivePreset(type);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (type === 'day') {
      setFromDate(todayStr);
      setToDate(todayStr);
      fetchData(todayStr, todayStr, selectedPlatform, fromBillNo, toBillNo);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const sStr = d.toISOString().slice(0, 10);
      setFromDate(sStr);
      setToDate(todayStr);
      fetchData(sStr, todayStr, selectedPlatform, fromBillNo, toBillNo);
    } else if (type === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(todayStr);
      fetchData(s, todayStr, selectedPlatform, fromBillNo, toBillNo);
    } else if (type === 'year') {
      const s = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(todayStr);
      fetchData(s, todayStr, selectedPlatform, fromBillNo, toBillNo);
    }
  };

  // SVG dimensions for Line Chart
  const svgWidth = Math.max(chartSeries.length * 60, 620);
  const svgHeight = 250;
  const paddingLeft = 55;
  const paddingRight = 45;
  const paddingTop = 25;
  const paddingBottom = 45;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate geometric (x, y) coordinates for each point
  const points = useMemo(() => {
    if (!chartSeries.length) return [];
    return chartSeries.map((item, idx) => {
      const x = chartSeries.length > 1
        ? paddingLeft + (idx / (chartSeries.length - 1)) * plotWidth
        : paddingLeft + plotWidth / 2;
      const count = Number(item.booking_count || 0);
      const y = paddingTop + plotHeight - (count / maxBookings) * plotHeight;
      return { ...item, x, y };
    });
  }, [chartSeries, maxBookings, plotWidth, plotHeight, paddingLeft, paddingTop]);

  // Connected SVG path string for the line
  const linePath = useMemo(() => {
    if (!points.length) return '';
    return points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`, '');
  }, [points]);

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
            Interactive time-series line graph filtered by date, bill/invoice range, and OTA booking platform.
          </p>
        </div>

        {/* Date Filter & OTA Channel Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569' }}>From:</span>
            <div style={{ width: '135px' }}>
              <ThemedDatePicker
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset(null);
                }}
                style={{ height: '34px', fontSize: '0.82rem', fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569' }}>To:</span>
            <div style={{ width: '135px' }}>
              <ThemedDatePicker
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset(null);
                }}
                style={{ height: '34px', fontSize: '0.82rem', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Quick Presets: Day, Week, Month, Year */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={activePreset === 'day' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => handlePreset('day')}
              style={{
                padding: '0 10px',
                height: '34px',
                fontSize: '0.78rem',
                fontWeight: 800,
                background: activePreset === 'day' ? '#0284c7' : undefined,
                color: activePreset === 'day' ? '#ffffff' : undefined
              }}
              title="Today's hourly bookings breakdown"
            >
              Day
            </button>
            <button
              type="button"
              className={activePreset === 'week' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => handlePreset('week')}
              style={{
                padding: '0 10px',
                height: '34px',
                fontSize: '0.78rem',
                fontWeight: 800,
                background: activePreset === 'week' ? '#0284c7' : undefined,
                color: activePreset === 'week' ? '#ffffff' : undefined
              }}
              title="Last 7 days (Week) trend"
            >
              Week
            </button>
            <button
              type="button"
              className={activePreset === 'month' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => handlePreset('month')}
              style={{
                padding: '0 10px',
                height: '34px',
                fontSize: '0.78rem',
                fontWeight: 800,
                background: activePreset === 'month' ? '#0284c7' : undefined,
                color: activePreset === 'month' ? '#ffffff' : undefined
              }}
              title="Current month daily trend"
            >
              Month
            </button>
            <button
              type="button"
              className={activePreset === 'year' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => handlePreset('year')}
              style={{
                padding: '0 10px',
                height: '34px',
                fontSize: '0.78rem',
                fontWeight: 800,
                background: activePreset === 'year' ? '#0284c7' : undefined,
                color: activePreset === 'year' ? '#ffffff' : undefined
              }}
              title="Yearly monthly trend"
            >
              Year
            </button>
          </div>

          {/* Bill No / Invoice No Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569' }}>Bill/Inv:</span>
            <input
              type="text"
              placeholder="From #"
              value={fromBillNo}
              onChange={(e) => setFromBillNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchData(fromDate, toDate, selectedPlatform, e.target.value, toBillNo);
              }}
              style={{
                width: '85px',
                height: '34px',
                fontSize: '0.80rem',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontWeight: 700,
                color: '#0f172a'
              }}
            />
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>-</span>
            <input
              type="text"
              placeholder="To #"
              value={toBillNo}
              onChange={(e) => setToBillNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchData(fromDate, toDate, selectedPlatform, fromBillNo, e.target.value);
              }}
              style={{
                width: '85px',
                height: '34px',
                fontSize: '0.80rem',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontWeight: 700,
                color: '#0f172a'
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => fetchData(fromDate, toDate, selectedPlatform, fromBillNo, toBillNo)}
              style={{ height: '34px', padding: '0 10px', fontSize: '0.78rem', fontWeight: 800 }}
              title="Apply bill/invoice number filter"
            >
              Apply
            </button>
            {(fromBillNo || toBillNo) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setFromBillNo('');
                  setToBillNo('');
                  fetchData(fromDate, toDate, selectedPlatform, '', '');
                }}
                style={{ height: '34px', padding: '0 8px', fontSize: '0.78rem', fontWeight: 750 }}
                title="Clear bill filter"
              >
                ✕
              </button>
            )}
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
            Across {chartSeries.length} intervals/points
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

      {/* Interactive Time Series SVG Line Graph */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#1e293b' }}>
            📈 Bookings Volume Line Chart ({fromDate} to {toDate})
            {(fromBillNo || toBillNo) && (
              <span style={{ marginLeft: '8px', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700 }}>
                [Bills: {fromBillNo || 'Start'} → {toBillNo || 'End'}]
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="24" height="12" viewBox="0 0 24 12" style={{ verticalAlign: 'middle' }}>
                <line x1="0" y1="6" x2="24" y2="6" stroke="#06b6d4" strokeWidth="3" />
                <circle cx="12" cy="6" r="4.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="3" />
              </svg>
              Bookings Volume
            </span>
          </div>
        </div>

        {/* SVG Graph Canvas with Orthogonal Gridlines & Line + Circular Node Markers */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0',
            padding: '16px 12px 10px',
            overflowX: 'auto',
            minHeight: '270px',
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {isLoading ? (
            <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
              ⏳ Loading analytics graph...
            </div>
          ) : chartSeries.length === 0 ? (
            <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>
              No bookings recorded in this filter range.
            </div>
          ) : (
            <div style={{ width: '100%', minWidth: `${svgWidth}px`, height: `${svgHeight}px`, position: 'relative' }}>
              <svg
                width={svgWidth}
                height={svgHeight}
                style={{ display: 'block', overflow: 'visible' }}
              >
                {/* Horizontal Gridlines & Y-axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const yPos = paddingTop + plotHeight * pct;
                  const tickVal = Math.round(maxBookings * (1 - pct));
                  return (
                    <g key={`h-grid-${idx}`}>
                      <line
                        x1={paddingLeft}
                        y1={yPos}
                        x2={svgWidth - paddingRight}
                        y2={yPos}
                        stroke="#e2e8f0"
                        strokeWidth="1.2"
                      />
                      <text
                        x={paddingLeft - 10}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight="750"
                        fill="#94a3b8"
                      >
                        {tickVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Gridlines & X-axis Labels */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredPoint?.date === pt.date && hoveredPoint?.label === pt.label;
                  return (
                    <g key={`v-grid-${idx}`}>
                      <line
                        x1={pt.x}
                        y1={paddingTop}
                        x2={pt.x}
                        y2={paddingTop + plotHeight}
                        stroke="#e2e8f0"
                        strokeWidth="1.2"
                      />
                      <text
                        x={pt.x}
                        y={paddingTop + plotHeight + 20}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={isHovered ? '850' : '650'}
                        fill={isHovered ? '#0284c7' : '#64748b'}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}

                {/* Hover Vertical Guide Line */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1={paddingTop}
                    x2={hoveredPoint.x}
                    y2={paddingTop + plotHeight}
                    stroke="#0891b2"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Connected Teal/Cyan Line */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Circular Node Markers (Matching user's reference image) */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredPoint?.date === pt.date && hoveredPoint?.label === pt.label;
                  const count = Number(pt.booking_count || 0);

                  return (
                    <g key={`node-${idx}`}>
                      {/* Count badge above node if > 0 */}
                      {count > 0 && (
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          textAnchor="middle"
                          fontSize="10.5"
                          fontWeight="850"
                          fill={isHovered ? '#0284c7' : '#475569'}
                        >
                          {count}
                        </text>
                      )}

                      {/* Circular Ring Marker */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 7.5 : 5.5}
                        fill="#ffffff"
                        stroke={isHovered ? '#0891b2' : '#06b6d4'}
                        strokeWidth={isHovered ? 4 : 3.5}
                        style={{
                          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                          filter: isHovered ? 'drop-shadow(0px 3px 6px rgba(6,182,212,0.5))' : 'none',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />

                      {/* Invisible larger hover hit area */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="18"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '24px',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.80rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
              zIndex: 10,
              pointerEvents: 'none',
              minWidth: '180px',
              border: '1px solid #334155'
            }}
          >
            <div style={{ fontWeight: 850, borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '6px', color: '#38bdf8' }}>
              📅 {hoveredPoint.label} {hoveredPoint.date && hoveredPoint.date !== hoveredPoint.label ? `(${hoveredPoint.date})` : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '3px 0' }}>
              <span style={{ color: '#94a3b8' }}>Bookings:</span>
              <strong style={{ color: '#ffffff' }}>{hoveredPoint.booking_count}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '3px 0' }}>
              <span style={{ color: '#94a3b8' }}>Rooms:</span>
              <strong style={{ color: '#ffffff' }}>{hoveredPoint.rooms_count}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '3px 0' }}>
              <span style={{ color: '#94a3b8' }}>Revenue:</span>
              <strong style={{ color: '#4ade80' }}>{formatCurrency(hoveredPoint.total_revenue)}</strong>
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
