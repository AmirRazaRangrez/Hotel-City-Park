import React from 'react';

export default function DestinationTabs({
  activeTab,
  onTabChange,
  department,
  myOrdersCount = 0
}) {
  const isBar = department === 'bar';
  const activeAccent = isBar ? 'var(--apple-purple)' : 'var(--apple-orange)';
  const activeBg = isBar ? 'var(--apple-purple-subtle)' : 'var(--apple-orange-subtle)';

  const tabs = [
    { id: 'orders', label: 'My Orders', iconFile: 'my-orders.png', fallbackEmoji: '📋', count: myOrdersCount },
    { id: 'tables', label: isBar ? 'Bar Tables' : 'Tables', iconFile: 'tables.png', fallbackEmoji: isBar ? '🍸' : '🍽️' },
    { id: 'rooms', label: 'Room Service', iconFile: 'room-service.png', fallbackEmoji: '🛏️' },
    { id: 'parcels', label: 'Parcels', iconFile: 'parcels.png', fallbackEmoji: '📦' }
  ];

  return (
    <nav
      aria-label="Navigation Tabs"
      style={{
        padding: '8px 12px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            id={`tab-btn-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            aria-label={tab.label}
            style={{
              flex: 1,
              padding: '9px 8px',
              borderRadius: 'var(--radius-sm, 12px)',
              background: isActive ? activeBg : 'var(--bg-surface-secondary)',
              border: isActive ? `1.5px solid ${activeAccent}` : '1px solid var(--border-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: isActive ? 'var(--shadow-subtle)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer'
            }}
          >
            <img
              src={`./icons/${tab.iconFile}`}
              alt={tab.label}
              style={{
                width: '26px',
                height: '26px',
                objectFit: 'contain',
                flexShrink: 0
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'inline';
                }
              }}
            />
            <span style={{ fontSize: '1.25rem', display: 'none' }}>{tab.fallbackEmoji}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '6px',
                  background: activeAccent,
                  color: 'var(--text-on-accent, #fff)',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  lineHeight: 1.2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
