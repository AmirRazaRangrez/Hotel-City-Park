import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server';
import db from '../database';

describe('Handover Statements Real Shift Verification (Multi-Device F&B Room Folio)', () => {
  beforeAll(() => {
    try {
      const room = db.prepare("SELECT id FROM rooms WHERE room_number = '502'").get();
      const roomId = room ? room.id : 92;

      let guest = db.prepare("SELECT id FROM guests WHERE name LIKE '%Mundewadi%'").get();
      let guestId;
      if (!guest) {
        const gRes = db.prepare("INSERT INTO guests (name, phone) VALUES ('Md Yahya Ab Wahid Mundewadi', '9999999999')").run();
        guestId = gRes.lastInsertRowid;
      } else {
        guestId = guest.id;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO bookings (id, room_id, guest_id, checkin_time, room_rate, total_room_charge, voucher_number, total_paid, split_cash, status, created_at)
        VALUES (84, ?, ?, '${todayStr} 10:00:00', 2350, 2350, '261104-684', 2000, 2000, 'active', '${todayStr} 10:00:00')
        ON CONFLICT(id) DO UPDATE SET room_id = ?, guest_id = ?, status = 'active'
      `).run(roomId, guestId, roomId, guestId);

      db.prepare(`
        INSERT INTO payments (id, receipt_no, booking_id, room_id, department, payment_type, payment_mode, amount, split_cash, cashier_name, created_at)
        VALUES (142, 'CR92', 84, ?, 'hospitality', 'advance', 'cash', 2000, 2000, 'cap-1', '${todayStr} 10:00:00')
        ON CONFLICT(id) DO UPDATE SET amount = 2000, split_cash = 2000, created_at = '${todayStr} 10:00:00'
      `).run(roomId);

      db.prepare(`
        INSERT INTO restaurant_orders (id, order_number, table_number, room_id, booking_id, subtotal, tax, total, payment_mode, is_paid, created_at, room_service_for, status, items_json)
        VALUES (55, 'RES-579167', 'RS-502', ?, 84, 360, 18, 378, 'room_folio', 0, '${todayStr} 13:02:00', 'room_mates', 'completed', '[]')
        ON CONFLICT(id) DO UPDATE SET total = 378, payment_mode = 'room_folio', created_at = '${todayStr} 13:02:00'
      `).run(roomId);

      db.prepare(`
        INSERT INTO restaurant_orders (id, order_number, table_number, subtotal, tax, total, payment_mode, is_paid, created_at, status, items_json)
        VALUES (56, 'RES-667469', 'T2', 540, 27, 567, 'cash', 1, '${todayStr} 13:30:00', 'completed', '[]')
        ON CONFLICT(id) DO UPDATE SET total = 567, payment_mode = 'cash', is_paid = 1, created_at = '${todayStr} 13:30:00'
      `).run();
    } catch (e) {
      console.warn('Test setup seed notice:', e.message);
    }
  });

  it('Verifies Front Office Handover shows B. To Pay F&B for Room Folio orders', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(`/api/hospitality/cash-handover-data?date=${todayStr}&shift=7am-7pm`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.foCashSales).toBeGreaterThanOrEqual(2000);
    expect(res.body.fbCashCollected).toBeGreaterThanOrEqual(378);
    expect(res.body.breakdowns.fnbCollectionDetails.length).toBeGreaterThanOrEqual(1);
    const item = res.body.breakdowns.fnbCollectionDetails.find(d => String(d.room_number) === '502');
    expect(item).toBeDefined();
    expect(item.totalRoomFnb).toBeGreaterThanOrEqual(378);
  });

  it('Verifies F&B Handover shows B. To Collect From Reception for Room Folio orders', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(`/api/restaurant/cash-handover-data?date=${todayStr}&shift=7am-7pm`);
    expect(res.status).toBe(200);
    expect(res.body.fnbCashSales).toBeGreaterThanOrEqual(567);
    expect(res.body.fbFromReception).toBeGreaterThanOrEqual(378);
    expect(res.body.breakdowns.receptionCollectionDetails.length).toBeGreaterThanOrEqual(1);
    const item = res.body.breakdowns.receptionCollectionDetails.find(d => String(d.room_number) === '502');
    expect(item).toBeDefined();
    expect(item.totalRoomFnb).toBeGreaterThanOrEqual(378);
  });
});
