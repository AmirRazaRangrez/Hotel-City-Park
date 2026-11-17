import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server';
import db from '../database';
import { generateToken } from '../middleware/auth';

describe('Restaurant Menu, Surcharges & Bill Delete Protection Suite', () => {
  let managerToken;

  beforeAll(() => {
    managerToken = generateToken({
      id: 9991,
      username: 'manager_pos',
      role: 'manager',
      can_access_manager: true
    });
  });

  it('1. Database has 65 active menu items across the 7 official categories', () => {
    const cats = db.prepare('SELECT * FROM restaurant_categories ORDER BY sort_order').all();
    expect(cats.length).toBe(7);
    const catNames = cats.map(c => c.name);
    expect(catNames).toEqual([
      'Breakfast & Hot/Cold Drinks',
      'Snacks',
      'Chinese',
      'Roti',
      'Main Course',
      'Rice',
      'Beverages'
    ]);

    const items = db.prepare("SELECT * FROM menu_items WHERE department = 'restaurant'").all();
    expect(items.length).toBe(65);

    // Verify key items
    const buffet = items.find(i => i.name === 'Buffet Breakfast');
    expect(buffet).toBeDefined();
    expect(buffet.price).toBe(250);
    expect(buffet.category).toBe('Breakfast & Hot/Cold Drinks');

    const tea = items.find(i => i.name === 'Tea');
    expect(tea).toBeDefined();
    expect(tea.price).toBe(40);

    const chickenHandiFull = items.find(i => i.name === 'Chicken Handi Full');
    expect(chickenHandiFull).toBeDefined();
    expect(chickenHandiFull.price).toBe(1100);
    expect(chickenHandiFull.category).toBe('Main Course');

    const water = items.find(i => i.name === 'Mineral Water Bottle 1 Ltr');
    expect(water).toBeDefined();
    expect(water.price).toBe(30);
    expect(water.category).toBe('Beverages');
  });

  it('2. GET /api/pos/settings returns restaurant_upi_mdr_pct and restaurant_card_surcharge_pct', async () => {
    const res = await request(app).get('/api/pos/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings).toBeDefined();
    expect(res.body.settings).toHaveProperty('restaurant_upi_mdr_pct');
    expect(res.body.settings).toHaveProperty('restaurant_card_surcharge_pct');
    expect(res.body.settings).toHaveProperty('restaurant_gst_pct');
  });

  it('3. POST /api/pos/settings persists restaurant_upi_mdr_pct and restaurant_card_surcharge_pct', async () => {
    const saveRes = await request(app)
      .post('/api/pos/settings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        restaurant_gst_pct: 5,
        restaurant_upi_mdr_pct: 1.25,
        restaurant_card_surcharge_pct: 2.0
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);

    const getRes = await request(app).get('/api/pos/settings');
    expect(getRes.body.settings.restaurant_upi_mdr_pct).toBe(1.25);
    expect(getRes.body.settings.restaurant_card_surcharge_pct).toBe(2.0);

    // Also verify /api/settings/surcharges reflects these
    const surRes = await request(app).get('/api/settings/surcharges');
    expect(surRes.body.restaurant_upi_mdr_pct).toBe(1.25);
    expect(surRes.body.restaurant_card_surcharge_pct).toBe(2.0);
  });

  it('4. POST /api/restaurant/settled-bills/delete is permanently disabled (HTTP 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/restaurant/settled-bills/delete')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ order_ids: [1, 2, 3] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Restaurant bills cannot be deleted/i);
  });

  it('5. DELETE /api/restaurant/orders/:id and /api/restaurant/settled-bills/:id are blocked with HTTP 403', async () => {
    // Insert a completed test restaurant bill
    const uniqueOrderNum = 'RO-TEST-' + Date.now();
    db.prepare(`
      INSERT INTO restaurant_orders (order_number, table_number, status, subtotal, total, payment_mode, items_json, created_at)
      VALUES (?, 'T1', 'completed', 500, 500, 'cash', '[]', datetime('now'))
    `).run(uniqueOrderNum);
    const testBill = db.prepare("SELECT id FROM restaurant_orders WHERE order_number = ?").get(uniqueOrderNum);

    // Attempt delete on settled bill endpoint
    const res1 = await request(app)
      .delete(`/api/restaurant/settled-bills/${testBill.id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res1.status).toBe(403);
    expect(res1.body.success).toBe(false);
    expect(res1.body.error).toMatch(/Restaurant bills cannot be deleted/i);

    // Attempt delete on restaurant order endpoint
    const res2 = await request(app)
      .delete(`/api/restaurant/orders/${testBill.id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res2.status).toBe(403);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error).toMatch(/Restaurant bills cannot be deleted/i);
  });
});
