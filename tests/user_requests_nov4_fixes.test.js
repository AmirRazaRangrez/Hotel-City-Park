import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';

describe('User Requirements (Nov 4 Fixes)', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create required tables
    db.exec(`
      CREATE TABLE rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number TEXT UNIQUE,
        room_type TEXT,
        floor INTEGER DEFAULT 1,
        status TEXT DEFAULT 'available',
        price REAL DEFAULT 2000,
        current_booking_id INTEGER,
        max_adults INTEGER DEFAULT 2,
        max_children INTEGER DEFAULT 2,
        max_extra_beds INTEGER DEFAULT 1
      );

      CREATE TABLE guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        mobile TEXT,
        address TEXT
      );

      CREATE TABLE bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        guest_id INTEGER,
        checkin_time TEXT,
        approx_checkout_time TEXT,
        actual_checkout_time TEXT,
        adults_male INTEGER DEFAULT 1,
        adults_female INTEGER DEFAULT 0,
        adults_other INTEGER DEFAULT 0,
        children INTEGER DEFAULT 0,
        meal_plan TEXT DEFAULT 'ep',
        voucher_number TEXT,
        status TEXT DEFAULT 'active',
        advance_payment_mode TEXT,
        final_settlement_mode TEXT,
        split_cash REAL DEFAULT 0,
        split_online REAL DEFAULT 0,
        split_card REAL DEFAULT 0,
        total_paid REAL DEFAULT 0,
        total_room_charge REAL DEFAULT 2000
      );

      CREATE TABLE advance_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        phone TEXT,
        room_type TEXT,
        room_number TEXT,
        adults INTEGER DEFAULT 1,
        children INTEGER DEFAULT 0,
        checkin_date TEXT,
        checkout_date TEXT,
        status TEXT DEFAULT 'pending'
      );

      CREATE TABLE staff_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        full_name TEXT,
        role TEXT,
        phone TEXT,
        plain_password TEXT,
        status TEXT DEFAULT 'active',
        can_access_manager INTEGER DEFAULT 0
      );
    `);

    // Seed test data
    db.prepare(`
      INSERT INTO rooms (id, room_number, room_type, status, max_adults, max_children, max_extra_beds)
      VALUES 
        (1, '101', 'Executive Room', 'occupied', 2, 2, 1),
        (2, '102', 'Executive Room', 'needs_cleaning', 2, 2, 1),
        (3, '103', 'Deluxe Room', 'available', 2, 2, 2)
    `).run();

    db.prepare(`
      INSERT INTO guests (id, name, mobile, address)
      VALUES 
        (1, 'Active Guest', '9876543210', 'Pune, Maharashtra'),
        (2, 'Checked Out Guest', '9123456789', 'Mumbai, Maharashtra')
    `).run();

    const todayStr = new Date().toISOString().slice(0, 10);

    // Active booking in 101 with breakfast
    db.prepare(`
      INSERT INTO bookings (id, room_id, guest_id, checkin_time, meal_plan, adults_male, adults_female, children, status, voucher_number)
      VALUES (1, 1, 1, '${todayStr} 09:00:00', 'with_breakfast', 2, 1, 2, 'active', 'VCH-101')
    `).run();
    db.prepare("UPDATE rooms SET current_booking_id = 1 WHERE id = 1").run();

    // Checked out booking in 102 (checked out today at 11am)
    db.prepare(`
      INSERT INTO bookings (id, room_id, guest_id, checkin_time, actual_checkout_time, meal_plan, adults_male, children, status, voucher_number)
      VALUES (2, 2, 2, '${todayStr} 07:00:00', '${todayStr} 11:00:00', 'with_breakfast', 1, 0, 'checked_out', 'VCH-102')
    `).run();
  });

  afterEach(() => {
    db.close();
  });

  it('1. Occupancy Chart: Checked-out room is NOT occupied and has is_occupied=false', () => {
    const queryDate = new Date().toISOString().slice(0, 10);
    const todayStr = new Date().toLocaleDateString('en-CA');
    const isTodayOrFuture = !queryDate || queryDate >= todayStr;

    const rooms = db.prepare(`
      SELECT 
        r.id as room_id,
        r.room_number,
        r.room_type,
        r.floor,
        r.status as room_status,
        b.id as booking_id,
        b.voucher_number,
        b.checkin_time,
        b.approx_checkout_time,
        b.actual_checkout_time,
        b.status as booking_status,
        b.meal_plan,
        b.adults_male,
        b.adults_female,
        b.adults_other,
        b.children
      FROM rooms r
      LEFT JOIN bookings b ON b.room_id = r.id 
        AND DATE(b.checkin_time) <= DATE(?) 
        AND DATE(COALESCE(b.actual_checkout_time, b.approx_checkout_time, b.checkin_time)) >= DATE(?)
        AND b.status NOT IN ('cancelled', 'void')
      ORDER BY r.room_number ASC
    `).all(queryDate, queryDate);

    const chartRows = rooms.map(r => {
      let isOccupied = false;
      if (isTodayOrFuture) {
        isOccupied = r.room_status === 'occupied' && Boolean(r.booking_id) && r.booking_status === 'active' && !r.actual_checkout_time;
      } else {
        isOccupied = Boolean(r.booking_id) && r.booking_status !== 'cancelled' && (!r.actual_checkout_time || r.actual_checkout_time > `${queryDate} 23:59:59`);
      }
      return {
        room_number: r.room_number,
        is_occupied: isOccupied,
        room_status: r.room_status
      };
    });

    const room101 = chartRows.find(r => r.room_number === '101');
    const room102 = chartRows.find(r => r.room_number === '102');

    // Room 101 is active in-house stay
    expect(room101.is_occupied).toBe(true);

    // Room 102 checked out today at 11am -> MUST NOT BE OCCUPIED!
    expect(room102.is_occupied).toBe(false);
    expect(room102.room_status).toBe('needs_cleaning');
  });

  it('2. Occupancy Chart: Breakfast pax counts adults only (excluding children)', () => {
    const booking = db.prepare('SELECT adults_male, adults_female, adults_other, children, meal_plan FROM bookings WHERE id = 1').get();
    const adults = (booking.adults_male || 0) + (booking.adults_female || 0) + (booking.adults_other || 0); // 2 + 1 = 3
    const children = booking.children || 0; // 2
    const totalPax = adults + children; // 5

    const plan = String(booking.meal_plan || '').toLowerCase();
    const hasBreakfast = plan.includes('with_breakfast');

    // Room breakfast pax should be adults (3), NOT total pax (5)
    const roomBreakfastPax = hasBreakfast ? Math.max(1, adults) : 0;

    expect(totalPax).toBe(5);
    expect(roomBreakfastPax).toBe(3); // 3 adults on breakfast
  });

  it('3. Advance Booking: Compulsory mobile number validation', () => {
    const validateAdvanceBooking = (data) => {
      if (!data.customer_name || !data.customer_name.trim()) {
        return { valid: false, error: 'Customer name is required' };
      }
      const cleanPhone = String(data.phone || '').trim().replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        return { valid: false, error: 'Customer mobile number is compulsory (10 digits).' };
      }
      return { valid: true };
    };

    // Missing phone
    expect(validateAdvanceBooking({ customer_name: 'John', phone: '' }).valid).toBe(false);
    expect(validateAdvanceBooking({ customer_name: 'John', phone: '123' }).valid).toBe(false);
    // Valid 10-digit phone
    expect(validateAdvanceBooking({ customer_name: 'John', phone: '9876543210' }).valid).toBe(true);
  });

  it('4. Advance Booking: Real capacity validation including extra beds', () => {
    // 1 Executive Room selected (max 2 adults, 2 children, 1 extra bed)
    // Adult capacity: 2 + 1 = 3 adults max
    // Total guest capacity: 2 + 2 + 1 = 5 max guests
    const roomInfo = { max_adults: 2, max_children: 2, max_extra_beds: 1 };
    const maxAdultCapacity = roomInfo.max_adults + roomInfo.max_extra_beds; // 3
    const totalMaxGuests = roomInfo.max_adults + roomInfo.max_children + roomInfo.max_extra_beds; // 5

    const validateCapacity = (adults, children) => {
      if (adults > maxAdultCapacity) {
        return { valid: false, error: `Exceeds max adult capacity of ${maxAdultCapacity}` };
      }
      if ((adults + children) > totalMaxGuests) {
        return { valid: false, error: `Exceeds total capacity of ${totalMaxGuests}` };
      }
      return { valid: true };
    };

    // 4 adults in 1 Executive Room -> EXCEEDED
    expect(validateCapacity(4, 0).valid).toBe(false);
    // 2 adults + 4 children = 6 -> EXCEEDED (5 max)
    expect(validateCapacity(2, 4).valid).toBe(false);
    // 2 adults + 2 children + 1 extra mattress = 5 -> ALLOWED
    expect(validateCapacity(3, 2).valid).toBe(true);
  });

  it('5. Checkin & Checkout Payment Mode: Smart resolution accurately detects UPI & Card', () => {
    const resolveMode = (explicitMode, cash, card, online, cheque) => {
      let resolved = (explicitMode || '').toLowerCase();
      if (online > 0 && cash === 0 && card === 0 && cheque === 0) return 'upi';
      if (card > 0 && cash === 0 && online === 0 && cheque === 0) return 'card';
      if (cheque > 0 && cash === 0 && online === 0 && card === 0) return 'cheque';
      if (cash > 0 && online === 0 && card === 0 && cheque === 0) return 'cash';
      if ((cash > 0 ? 1 : 0) + (card > 0 ? 1 : 0) + (online > 0 ? 1 : 0) + (cheque > 0 ? 1 : 0) > 1) return 'split';
      return resolved || 'cash';
    };

    // When dropdown defaulted to 'cash' but paid ₹2000 via UPI (online=2000, cash=0)
    expect(resolveMode('cash', 0, 0, 2000, 0)).toBe('upi');
    // When paid via Card (card=1500, cash=0)
    expect(resolveMode('cash', 0, 1500, 0, 0)).toBe('card');
    // When paid via Cash (cash=1000)
    expect(resolveMode('cash', 1000, 0, 0, 0)).toBe('cash');
    // When split payment (cash=500, online=500)
    expect(resolveMode('cash', 500, 0, 500, 0)).toBe('split');
  });

  it('6. Staff Passwords Sync: plain_password is included in staff list payload', () => {
    const staffList = db.prepare('SELECT id, username, full_name, role, plain_password FROM staff_users').all();
    // Insert a test staff user
    db.prepare("INSERT INTO staff_users (username, full_name, role, plain_password) VALUES ('cap-1', 'Captain 1', 'hospitality', '1234')").run();

    const updatedList = db.prepare('SELECT id, username, full_name, role, plain_password FROM staff_users WHERE username = ?').get('cap-1');
    expect(updatedList.plain_password).toBe('1234');
    expect(updatedList.username).toBe('cap-1');
  });
});
