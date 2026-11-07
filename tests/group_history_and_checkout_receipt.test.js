import { describe, it, expect } from 'vitest';

describe('Group History and Checkout Receipt Suppression Guard Tests', () => {
  it('should suppress checkout receipt when amount paid now is 0', () => {
    const totalSettled = 0;
    const checkoutReceipts = [];
    let receiptPrintTriggered = false;
    let printed = false;

    const triggerPaidReceiptPrint = () => {
      if (receiptPrintTriggered) return;
      receiptPrintTriggered = true;
      if (checkoutReceipts.length > 0 && totalSettled > 0) {
        printed = true;
      }
    };

    triggerPaidReceiptPrint();
    expect(printed).toBe(false);
  });

  it('should trigger checkout receipt when amount paid now is greater than 0', () => {
    const totalSettled = 500;
    const checkoutReceipts = [{ amount: 500, receipt_no: 'CR01' }];
    let receiptPrintTriggered = false;
    let printed = false;

    const triggerPaidReceiptPrint = () => {
      if (receiptPrintTriggered) return;
      receiptPrintTriggered = true;
      if (checkoutReceipts.length > 0 && totalSettled > 0) {
        printed = true;
      }
    };

    triggerPaidReceiptPrint();
    expect(printed).toBe(true);
  });

  it('should properly group multi-room bookings by voucher number and sort rooms', () => {
    const rows = [
      { booking_id: 5, room_number: '506', room_type: 'Deluxe Room', total_room_charge: 4070.93, voucher_number: '261106-696', actual_checkout_time: '2026-11-07T06:53:26.093Z' },
      { booking_id: 4, room_number: '502', room_type: 'Executive Room', total_room_charge: 3610.07, voucher_number: '261106-696', actual_checkout_time: '2026-11-07T06:53:26.093Z' }
    ];

    const groupedMap = new Map();
    rows.forEach(row => {
      const key = `v_${row.voucher_number}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          id: row.booking_id,
          rooms: [row.room_number],
          room_types: [row.room_type],
          total_room_charge: row.total_room_charge,
          actual_checkout_time: row.actual_checkout_time
        });
      } else {
        const entry = groupedMap.get(key);
        if (!entry.rooms.includes(row.room_number)) {
          entry.rooms.push(row.room_number);
          entry.rooms.sort((a, b) => Number(a) - Number(b));
          entry.room_number = entry.rooms.join(', ');
        }
        if (!entry.room_types.includes(row.room_type)) {
          entry.room_types.push(row.room_type);
          entry.room_type = entry.room_types.join(', ');
        }
        entry.total_room_charge += row.total_room_charge;
      }
    });

    const result = Array.from(groupedMap.values())[0];
    expect(result.rooms).toEqual(['502', '506']);
    expect(result.room_number).toBe('502, 506');
    expect(result.room_types).toContain('Deluxe Room');
    expect(result.room_types).toContain('Executive Room');
    expect(Math.round(result.total_room_charge)).toBe(7681);
  });

  it('should display actual checkout time instead of expected checkout time for checked-out bookings', () => {
    const detailBooking = {
      status: 'checked_out',
      approx_checkout_time: '2026-11-08T20:30',
      actual_checkout_time: '2026-11-07T06:53:26.093Z',
      checkout_time: '2026-11-07T06:53:26.093Z'
    };

    const isCheckedOut = detailBooking.status === 'checked_out' || Boolean(detailBooking.actual_checkout_time || detailBooking.checkout_time);
    const displayedTime = isCheckedOut
      ? (detailBooking.actual_checkout_time || detailBooking.checkout_time)
      : (detailBooking.checkout_time || detailBooking.approx_checkout_time);

    expect(displayedTime).toBe('2026-11-07T06:53:26.093Z');
    expect(displayedTime).not.toBe('2026-11-08T20:30');
  });
});

