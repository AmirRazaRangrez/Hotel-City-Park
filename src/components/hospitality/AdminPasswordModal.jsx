import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Admin Authorization',
  description = 'Enter Manager / Admin password to grant permission immediately.',
  approvalId = null,
  actionType = 'general',
  details = null
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setErrorMsg('');
    setShowPassword(false);
    setIsSubmitting(false);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, password, isSubmitting]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMsg('Please enter admin password');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/owner/approvals/verify-password', {
        password: trimmed,
        approvalId,
        actionType,
        details
      });

      if (res && res.approved) {
        if (typeof onSuccess === 'function') {
          onSuccess(res);
        }
        onClose();
      } else {
        setErrorMsg(res?.error || 'Incorrect admin password');
      }
    } catch (err) {
      setErrorMsg(err?.message || err?.data?.error || 'Incorrect admin password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔑</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {title}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
                Instant Local Permission Override
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#e2e8f0',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#475569', lineHeight: 1.45 }}>
            {description}
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.80rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Manager / Admin Password:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                disabled={isSubmitting}
                placeholder="Enter password..."
                autoComplete="current-password"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 42px 10px 12px',
                  borderRadius: '10px',
                  border: errorMsg ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1rem',
                  padding: '4px'
                }}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
            {errorMsg && (
              <div
                style={{
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSubmitting ? 'Verifying...' : 'Authorize ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
