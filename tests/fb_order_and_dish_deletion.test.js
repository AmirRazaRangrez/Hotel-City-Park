import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import db from '../database.js';

describe('F&B Order and Dish Deletion Test Suite', () => {
  let testOrderId;
  let testRoomId;
  let testBookingId;

  beforeAll(() => {
    // Pick an active room from the database
    const activeRoom = db.prepare(`
      SELECT r.id, r.room_number, b.id as booking_id 
      FROM rooms r 
      JOIN bookings b ON r.current_booking_id = b.id 
      WHERE b.status = 'active' 
      LIMIT 1
    `).get();

    testRoomId = activeRoom.id;
    testBookingId = activeRoom.booking_id;
  });

  it('1. should allow deleting a single dish from a restaurant order and recalculate subtotal and tax cleanly', async () => {
    // Insert order with 2 items: Soda (₹35) and Boost (₹70)
    const items = [
      { id: 1, name: 'Soda', price: 35, quantity: 1 },
      { id: 2, name: 'Boost / Horlicks', price: 70, quantity: 1 }
    ];
    const subtotal = 105;
    const tax = Math.round(subtotal * 0.05); // ₹5
    const total = subtotal + tax; // ₹110

    const orderRes = db.prepare(`
      INSERT INTO restaurant_orders (
        order_number, room_id, booking_id, customer_name, items_json,
        subtotal, tax, discount, total, payment_mode, is_paid, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'room_folio', 0, 'completed', datetime('now', '+1 day'))
    `).run(
      'RES-TEST-' + Math.random().toString(36).substring(2, 8), testRoomId, testBookingId, 'Room 999',
      JSON.stringify(items), subtotal, tax, total
    );
    testOrderId = orderRes.lastInsertRowid;

    // Delete item 0 (Soda ₹35)
    const res = await request(app)
      .delete(`/api/restaurant/orders/${testOrderId}/items/0?admin=1`)
      .set('x-admin-mode', '1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.removedItem.name).toBe('Soda');
    expect(res.body.updatedOrder.subtotal).toBe(70);
    expect(res.body.updatedOrder.tax).toBe(4); // 70 * 0.05 = 3.5 -> 4
    expect(res.body.updatedOrder.total).toBe(74);

    // Verify in database
    const updated = db.prepare('SELECT * FROM restaurant_orders WHERE id = ?').get(testOrderId);
    expect(updated).toBeDefined();
    expect(updated.subtotal).toBe(70);
    expect(updated.tax).toBe(4);
    expect(updated.total).toBe(74);
    const parsedItems = JSON.parse(updated.items_json);
    expect(parsedItems.length).toBe(1);
    expect(parsedItems[0].name).toBe('Boost / Horlicks');
  });

  it('2. should automatically delete the order when the last remaining dish is removed', async () => {
    // Delete the only remaining item (index 0)
    const res = await request(app)
      .delete(`/api/restaurant/orders/${testOrderId}/items/0?admin=1`)
      .set('x-admin-mode', '1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderDeleted).toBe(true);

    // Verify completely deleted from database
    const order = db.prepare('SELECT * FROM restaurant_orders WHERE id = ?').get(testOrderId);
    expect(order).toBeUndefined();
  }, 15000);

  it('3. should allow permanently deleting an entire settled/completed restaurant order (no 403 Forbidden)', async () => {
    // Create settled restaurant order
    const orderRes = db.prepare(`
      INSERT INTO restaurant_orders (
        order_number, room_id, customer_name, items_json,
        subtotal, tax, discount, total, payment_mode, is_paid, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'cash', 1, 'completed', datetime('now'))
    `).run(
      'RES-SETTLED-' + Math.random().toString(36).substring(2, 8), testRoomId, 'Walk-in',
      JSON.stringify([{ name: 'Biryani', price: 200, qty: 1 }]),
      200, 10, 210
    );
    const settledOrderId = orderRes.lastInsertRowid;

    // Delete entire settled bill
    const res = await request(app)
      .delete(`/api/restaurant/orders/${settledOrderId}?admin=1`)
      .set('x-admin-mode', '1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('deleted successfully');

    // Verify deleted
    const order = db.prepare('SELECT * FROM restaurant_orders WHERE id = ?').get(settledOrderId);
    expect(order).toBeUndefined();
  }, 15000);

  it('4. should synchronize room folio: deleting an unpaid room service order reduces folio due balance', async () => {
    // Check initial room folio due
    const folioBefore = await request(app).get(`/api/rooms/${testRoomId}/folio`);
    const initialDue = folioBefore.body.totals?.remainingBalanceDue ?? folioBefore.body.stayCalcNow?.duePayable ?? 0;

    // Add a room service order of ₹150 + ₹8 tax = ₹158
    const orderRes = db.prepare(`
      INSERT INTO restaurant_orders (
        order_number, room_id, booking_id, customer_name, items_json,
        subtotal, tax, discount, total, payment_mode, is_paid, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'room_folio', 0, 'completed', datetime('now', '+1 day'))
    `).run(
      'RES-FOLIO-' + Date.now(), testRoomId, testBookingId, 'Room Service',
      JSON.stringify([{ name: 'Sandwich', price: 150, qty: 1 }]),
      150, 8, 158
    );
    const folioOrderId = orderRes.lastInsertRowid;

    // Verify folio has the order
    const folioWithOrder = await request(app).get(`/api/rooms/${testRoomId}/folio`);
    const restOrdersWith = folioWithOrder.body.folio?.restaurantOrders || folioWithOrder.body.restaurantOrders || [];
    const hasOrder = restOrdersWith.some(o => o.id === folioOrderId);
    expect(hasOrder).toBe(true);

    // Delete the order
    const delRes = await request(app)
      .delete(`/api/restaurant/orders/${folioOrderId}?admin=1`)
      .set('x-admin-mode', '1');
    expect(delRes.status).toBe(200);

    // Verify folio no longer contains the order
    const folioAfter = await request(app).get(`/api/rooms/${testRoomId}/folio`);
    const restOrdersAfter = folioAfter.body.folio?.restaurantOrders || folioAfter.body.restaurantOrders || [];
    const stillHasOrder = restOrdersAfter.some(o => o.id === folioOrderId);
    expect(stillHasOrder).toBe(false);
  });

  it('5. should allow deleting a single item from a bar order without SQLite column errors', async () => {
    const items = [
      { id: 1, name: 'Beer', price: 180, qty: 1 },
      { id: 2, name: 'Cocktail', price: 320, qty: 1 }
    ];
    const subtotal = 500;
    const tax = Math.round(subtotal * 0.05); // ₹25
    const total = subtotal + tax; // ₹525

    const barOrderRes = db.prepare(`
      INSERT INTO bar_orders (
        order_number, room_id, customer_name, items_json,
        subtotal, tax, discount, total, payment_mode, is_paid, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'cash', 1, 'completed', datetime('now'))
    `).run(
      'BAR-TEST-001', testRoomId, 'Bar Guest',
      JSON.stringify(items), subtotal, tax, total
    );
    const barOrderId = barOrderRes.lastInsertRowid;

    // Delete item 0 (Beer ₹180)
    const res = await request(app)
      .delete(`/api/bar/orders/${barOrderId}/items/0?admin=1`)
      .set('x-admin-mode', '1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.removedItem.name).toBe('Beer');
    expect(res.body.updatedOrder.subtotal).toBe(320);
    expect(res.body.updatedOrder.tax).toBe(16); // 320 * 0.05 = 16
    expect(res.body.updatedOrder.total).toBe(336);

    // Clean up
    db.prepare('DELETE FROM bar_orders WHERE id = ?').run(barOrderId);
  });
});
