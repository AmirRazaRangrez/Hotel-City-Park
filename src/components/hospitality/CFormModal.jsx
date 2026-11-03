import React, { useState, useEffect } from 'react';
import { printCForm, downloadCFormPDF } from '../../services/printService';

export default function CFormModal({ isOpen, onClose, initialData = {}, onSave }) {
  const DEFAULT_POLICE_STATION = `Faujdar Chavadi Police Station\n(Near Mule Hospital, Railway lines, Murarji Peth, Solapur)`;

  const [formData, setFormData] = useState({
    houseOwnerParticulars: 'Hotel City Paark, 119, Murarji Peth, Char Hutatma Chowk, Solapur - 413 001',
    policeStationName: DEFAULT_POLICE_STATION,
    foreignerName: '',
    nationality: '',
    addressInSolapur: 'Hotel City Paark, 119 Murarji Peth, Solapur - 413001',
    passportNo: '',
    passportPlaceOfIssue: '',
    passportDateOfIssue: '',
    passportValidTill: '',
    visaNo: '',
    visaPlaceOfIssue: '',
    visaDateOfIssue: '',
    visaValidTill: '',
    visaType: 'Tourist',
    arrivalDateIndia: '',
    arrivalPlaceIndia: 'Mumbai Airport',
    purposeOfVisit: 'Tourism / Sightseeing',
    contactPersonName: 'Front Desk Manager',
    contactPersonTel: '0217-2729712 / 9146200000',
    proposedDuration: '3 Days',
    arrivalDateTimeHotel: '',
    rpNo: 'N/A',
    rpDateOfIssue: 'N/A',
    rpValidTill: 'N/A',
    rpIssuingAuth: 'N/A',
    isPoliceInformed: true,
    foreignerPhone: '',
    landlordPhone: '0217-2729712 / 9890012345'
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(prev => ({
        ...prev,
        policeStationName: initialData.policeStationName || initialData.cFormData?.policeStationName || DEFAULT_POLICE_STATION,
        foreignerName: (initialData.guestName || initialData.foreignerName || initialData.name || '').toUpperCase(),
        nationality: (initialData.nationality || '').toUpperCase(),
        passportNo: initialData.passportNo || initialData.passport_number || initialData.idNumber || '',
        passportPlaceOfIssue: initialData.passportPlaceOfIssue || '',
        passportDateOfIssue: initialData.passportDateOfIssue || '',
        passportValidTill: initialData.expiryDate || initialData.passportValidTill || '',
        arrivalDateTimeHotel: initialData.checkinTime || new Date().toLocaleString('en-IN'),
        foreignerPhone: initialData.mobile || initialData.phone || '',
        proposedDuration: initialData.stayNights ? `${initialData.stayNights} Night(s)` : '3 Days',
        ...initialData.cFormData
      }));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handlePrint = () => {
    printCForm(formData);
  };

  const handleDownload = async () => {
    await downloadCFormPDF(formData);
  };

  const handleSaveAndClose = () => {
    if (onSave) {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop active" style={{ zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
      <div
        className="modal-card"
        style={{
          width: '94%',
          maxWidth: '920px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          background: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛂</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Foreigner Registration — Police Form 'C'
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                Rule 14(6) Registration of Foreigners Rules, 1992 • Mandatory within 24h of Arrival
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
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 800
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form with editable fields */}
        <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1, fontSize: '0.88rem' }}>
          
          {/* Section 1: House Owner & Hotel Particulars + Police Station */}
          <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
            <div style={{ fontWeight: 850, color: '#0f172a', marginBottom: '10px', fontSize: '0.88rem' }}>
              1. House Owner / Hotel Particulars &amp; Police Station
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                  House Owner / Hotel Name &amp; Full Address *
                </label>
                <textarea
                  className="form-input form-input-sm"
                  rows={3}
                  value={formData.houseOwnerParticulars}
                  onChange={(e) => handleChange('houseOwnerParticulars', e.target.value)}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                  Jurisdiction Police Station (Default) *
                </label>
                <textarea
                  className="form-input form-input-sm"
                  rows={3}
                  value={formData.policeStationName}
                  onChange={(e) => handleChange('policeStationName', e.target.value)}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.82rem', fontWeight: 700, color: '#0369a1' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Foreigner Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                2. Foreigner's Full Name (in Capital) *
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.foreignerName}
                onChange={(e) => handleChange('foreignerName', e.target.value.toUpperCase())}
                style={{ fontWeight: 800, textTransform: 'uppercase' }}
                placeholder="FULL NAME AS IN PASSPORT"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                3. Nationality *
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value.toUpperCase())}
                style={{ fontWeight: 800, textTransform: 'uppercase' }}
                placeholder="e.g. AMERICAN, GERMAN, UK"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                Address in Solapur *
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.addressInSolapur}
                onChange={(e) => handleChange('addressInSolapur', e.target.value)}
                placeholder="Hotel Address in Solapur"
              />
            </div>
          </div>

          {/* Section 3: Passport & Visa Particulars (2 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            {/* Left: Passport */}
            <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '12px', border: '1.5px solid #bae6fd' }}>
              <div style={{ fontWeight: 900, color: '#0369a1', marginBottom: '10px', fontSize: '0.86rem' }}>
                4. Passport Particulars
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0369a1' }}>1. Passport Number *</label>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    value={formData.passportNo}
                    onChange={(e) => handleChange('passportNo', e.target.value)}
                    style={{ fontWeight: 800, fontFamily: 'monospace' }}
                    placeholder="e.g. A12345678"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0369a1' }}>2. Place of Issue</label>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    value={formData.passportPlaceOfIssue}
                    onChange={(e) => handleChange('passportPlaceOfIssue', e.target.value)}
                    placeholder="e.g. Washington, London"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0369a1' }}>3. Date of Issue</label>
                    <input
                      type="date"
                      className="form-input form-input-sm"
                      value={formData.passportDateOfIssue}
                      onChange={(e) => handleChange('passportDateOfIssue', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0369a1' }}>4. Valid Till *</label>
                    <input
                      type="date"
                      className="form-input form-input-sm"
                      value={formData.passportValidTill}
                      onChange={(e) => handleChange('passportValidTill', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Visa */}
            <div style={{ background: '#fefce8', padding: '14px', borderRadius: '12px', border: '1.5px solid #fde047' }}>
              <div style={{ fontWeight: 900, color: '#854d0e', marginBottom: '10px', fontSize: '0.86rem' }}>
                Visa Particulars
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#854d0e' }}>1. Visa Number</label>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    value={formData.visaNo}
                    onChange={(e) => handleChange('visaNo', e.target.value)}
                    placeholder="e.g. V12345678"
                    style={{ fontWeight: 800, fontFamily: 'monospace' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#854d0e' }}>2. Place of Issue</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={formData.visaPlaceOfIssue}
                      onChange={(e) => handleChange('visaPlaceOfIssue', e.target.value)}
                      placeholder="e.g. New York, Embassy"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#854d0e' }}>5. Type of Visa</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={formData.visaType}
                      onChange={(e) => handleChange('visaType', e.target.value)}
                      placeholder="Tourist / Business"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#854d0e' }}>3. Date of Issue</label>
                    <input
                      type="date"
                      className="form-input form-input-sm"
                      value={formData.visaDateOfIssue}
                      onChange={(e) => handleChange('visaDateOfIssue', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 750, color: '#854d0e' }}>4. Valid Till</label>
                    <input
                      type="date"
                      className="form-input form-input-sm"
                      value={formData.visaValidTill}
                      onChange={(e) => handleChange('visaValidTill', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Stay & Travel Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                5. Date &amp; Place of Arrival in India
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="date"
                  className="form-input form-input-sm"
                  value={formData.arrivalDateIndia}
                  onChange={(e) => handleChange('arrivalDateIndia', e.target.value)}
                  style={{ width: '130px' }}
                />
                <input
                  type="text"
                  className="form-input form-input-sm"
                  value={formData.arrivalPlaceIndia}
                  onChange={(e) => handleChange('arrivalPlaceIndia', e.target.value)}
                  placeholder="Port / Airport"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                6. Purpose of Visit
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.purposeOfVisit}
                onChange={(e) => handleChange('purposeOfVisit', e.target.value)}
                placeholder="Tourism / Business"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                8. Duration of Stay in Solapur
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.proposedDuration}
                onChange={(e) => handleChange('proposedDuration', e.target.value)}
                placeholder="e.g. 3 Days"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                9. Date &amp; Time of Arrival at Hotel
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.arrivalDateTimeHotel}
                onChange={(e) => handleChange('arrivalDateTimeHotel', e.target.value)}
                placeholder="DD/MM/YYYY, HH:MM"
              />
            </div>
          </div>

          {/* Section 5: Contact Person Details (Point 7) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                7. Contact Person — Name in Solapur
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.contactPersonName}
                onChange={(e) => handleChange('contactPersonName', e.target.value)}
                placeholder="Front Desk Manager / Contact Person"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                Contact Person — Tel / Mobile No.
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.contactPersonTel}
                onChange={(e) => handleChange('contactPersonTel', e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Section 6: Certificate of Registration Permit (Point 10) */}
          <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 850, color: '#0f172a', marginBottom: '8px', fontSize: '0.84rem' }}>
              10. Certificate of Registration Permit (if any) — R. P. Particulars
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569' }}>R. P. Number</label>
                <input
                  type="text"
                  className="form-input form-input-sm"
                  value={formData.rpNo}
                  onChange={(e) => handleChange('rpNo', e.target.value)}
                  placeholder="N/A or RP Number"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569' }}>Date of Issue</label>
                <input
                  type="text"
                  className="form-input form-input-sm"
                  value={formData.rpDateOfIssue}
                  onChange={(e) => handleChange('rpDateOfIssue', e.target.value)}
                  placeholder="N/A or Date"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569' }}>Valid Till</label>
                <input
                  type="text"
                  className="form-input form-input-sm"
                  value={formData.rpValidTill}
                  onChange={(e) => handleChange('rpValidTill', e.target.value)}
                  placeholder="N/A or Date"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569' }}>Issuing Authority</label>
                <input
                  type="text"
                  className="form-input form-input-sm"
                  value={formData.rpIssuingAuth}
                  onChange={(e) => handleChange('rpIssuingAuth', e.target.value)}
                  placeholder="N/A or Authority"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Police Intimation (Point 11) */}
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
              <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                11. Whether Information is given to Police Station about tenant?
              </strong>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="policeInformed"
                    checked={formData.isPoliceInformed === true}
                    onChange={() => handleChange('isPoliceInformed', true)}
                  />
                  Yes (Informed)
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="policeInformed"
                    checked={formData.isPoliceInformed === false}
                    onChange={() => handleChange('isPoliceInformed', false)}
                  />
                  No
                </label>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 750, color: '#475569', marginBottom: '3px' }}>
                Police Station Name &amp; Address:
              </label>
              <textarea
                className="form-input form-input-sm"
                rows={2}
                value={formData.policeStationName}
                onChange={(e) => handleChange('policeStationName', e.target.value)}
                style={{ width: '100%', resize: 'vertical', fontSize: '0.82rem', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Section 8: Signatures Contact Numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                Foreigner Contact / Mobile No.
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.foreignerPhone}
                onChange={(e) => handleChange('foreignerPhone', e.target.value)}
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 800, color: '#334155', marginBottom: '4px', fontSize: '0.78rem' }}>
                Landlord / Hotel Phone No.
              </label>
              <input
                type="text"
                className="form-input form-input-sm"
                value={formData.landlordPhone}
                onChange={(e) => handleChange('landlordPhone', e.target.value)}
                placeholder="Hotel contact phone"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 22px',
            background: '#f8fafc',
            borderTop: '1.5px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Form 'C' format adheres strictly to Maharashtra State Foreigner Registration Rules.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownload}
              style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 700 }}
            >
              📥 Download PDF
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePrint}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                background: '#2563eb',
                borderColor: '#1d4ed8',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🖨️</span> Print Form 'C'
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveAndClose}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 750,
                background: '#059669',
                borderColor: '#047857',
                color: '#fff'
              }}
            >
              ✓ Save &amp; Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
