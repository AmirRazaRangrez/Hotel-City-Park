import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Setup mock window/self if needed
if (typeof global.self === 'undefined') {
  global.self = global;
}
if (typeof global.window === 'undefined') {
  global.window = global;
}

describe('User Enhancements: Manager Analysis Graph, C-Form & Cash Handover Date', () => {

  it('1. verifies Guest Portal base URL returns https://guestweb.dominal.in', async () => {
    const guestDiningService = (await import('../services/guestDiningService.js')).default;
    const url = guestDiningService.getGuestPortalBaseUrl();
    expect(url).toBe('https://guestweb.dominal.in');
  });

  it('2. verifies CashHandoverModal and FnBCashHandoverModal use ThemedDatePicker for date selection', () => {
    const foHandover = fs.readFileSync(path.resolve('src/components/hospitality/CashHandoverModal.jsx'), 'utf8');
    const fnbHandover = fs.readFileSync(path.resolve('src/components/restaurant/FnBCashHandoverModal.jsx'), 'utf8');

    expect(foHandover).toContain('<ThemedDatePicker');
    expect(foHandover).not.toContain('<input\n              type="date"\n              value={date}');

    expect(fnbHandover).toContain('<ThemedDatePicker');
    expect(fnbHandover).not.toContain('<input\n              type="date"\n              value={date}');
  });

  it('3. verifies CFormModal has all fields editable and default Faujdar Chavadi Police Station', () => {
    const cFormCode = fs.readFileSync(path.resolve('src/components/hospitality/CFormModal.jsx'), 'utf8');

    expect(cFormCode).toContain('Faujdar Chavadi Police Station');
    expect(cFormCode).toContain('Near Mule Hospital, Railway lines, Murarji Peth, Solapur');
    expect(cFormCode).toContain('houseOwnerParticulars');
    expect(cFormCode).toContain('policeStationName');
    expect(cFormCode).toContain('rpNo');
    expect(cFormCode).toContain('rpDateOfIssue');
    expect(cFormCode).toContain('rpValidTill');
    expect(cFormCode).toContain('rpIssuingAuth');
    expect(cFormCode).toContain('contactPersonName');
    expect(cFormCode).toContain('contactPersonTel');
  });

  it('4. verifies printService buildCFormHTML defaults to Faujdar Chavadi Police Station in printed output', () => {
    const printCode = fs.readFileSync(path.resolve('src/services/printService.js'), 'utf8');
    expect(printCode).toContain('Faujdar Chavadi Police Station');
    expect(printCode).toContain('Near Mule Hospital, Railway lines, Murarji Peth, Solapur');
  });

  it('5. verifies BookingAnalysisGraph is embedded in ManagePage and server.js has the endpoint', () => {
    const managePage = fs.readFileSync(path.resolve('src/pages/ManagePage.jsx'), 'utf8');
    const serverCode = fs.readFileSync(path.resolve('server.js'), 'utf8');

    expect(managePage).toContain('BookingAnalysisGraph');
    expect(serverCode).toContain('/api/manager/booking-analysis');
  });
});
