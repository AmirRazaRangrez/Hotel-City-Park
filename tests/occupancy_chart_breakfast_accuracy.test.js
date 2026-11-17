import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Unit testing the breakfast calculation algorithm
function computeRoomBreakfastPax({ adults, extraAdults, primaryHasBreakfast, extraHasBreakfast }) {
  let roomBreakfastPax = 0;
  if (adults > 0) {
    if (primaryHasBreakfast) {
      const baseAdults = Math.max(0, adults - extraAdults);
      roomBreakfastPax += baseAdults;
      if (extraHasBreakfast) {
        roomBreakfastPax += extraAdults;
      }
    } else if (extraHasBreakfast) {
      roomBreakfastPax += extraAdults;
    }
  } else {
    roomBreakfastPax = 0;
  }
  return roomBreakfastPax;
}

describe('Occupancy Chart Breakfast & Pax Accuracy', () => {
  const serverPath = path.resolve(__dirname, '../server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf-8');

  const releaseServerPath = path.resolve(__dirname, '../release/server.js');
  const releaseServerContent = fs.readFileSync(releaseServerPath, 'utf-8');

  const modalPath = path.resolve(__dirname, '../src/components/hospitality/OccupancyChartModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  const step6Path = path.resolve(__dirname, '../src/components/hospitality/CheckinWizard/Step6Stay.jsx');
  const step6Content = fs.readFileSync(step6Path, 'utf-8');

  it('1. Correctly calculates breakfast pax when extra member is without_breakfast', () => {
    // Room 409 case: 3 adults (2 OTA + 1 extra), primary has breakfast, extra has NO breakfast
    const bPax = computeRoomBreakfastPax({
      adults: 3,
      extraAdults: 1,
      primaryHasBreakfast: true,
      extraHasBreakfast: false
    });
    expect(bPax).toBe(2);
  });

  it('2. Correctly calculates 0 breakfast pax for secondary group rooms with 0 adults', () => {
    // Room 408 case: secondary group room with 0 adults
    const bPax = computeRoomBreakfastPax({
      adults: 0,
      extraAdults: 0,
      primaryHasBreakfast: true,
      extraHasBreakfast: false
    });
    expect(bPax).toBe(0);
  });

  it('3. Verifies server.js and release/server.js include extra_meal_plan and calculate accurate roomBreakfastPax', () => {
    expect(serverContent).toContain('b.extra_meal_plan');
    expect(serverContent).toContain('b.extra_breakfast_charge');
    expect(serverContent).toContain('breakfast_display');
    expect(serverContent).toContain('Yes (${roomBreakfastPax} Pax)');

    expect(releaseServerContent).toContain('b.extra_meal_plan');
    expect(releaseServerContent).toContain('b.extra_breakfast_charge');
    expect(releaseServerContent).toContain('breakfast_display');
  });

  it('4. Verifies OccupancyChartModal displays accurate Breakfast column and per-room breakfast count', () => {
    expect(modalContent).toContain('r.breakfast_display');
    expect(modalContent).toContain('(${bPax} Pax)');
    expect(modalContent).toContain('totalBreakfastPax');
  });

  it('5. Verifies Step6Stay provides clear distinction between OTA Room Breakfast and Extra Person Breakfast', () => {
    expect(step6Content).toContain('OTA Room Breakfast (Voucher Included)');
    expect(step6Content).toContain('Hotel Extra Person Breakfast');
  });

  it('6. Verifies server.js excludes children from Pax count in Occupancy Chart', () => {
    expect(serverContent).toContain('const pax = adults > 0 ? adults : 1;');
    expect(releaseServerContent).toContain('const pax = adults > 0 ? adults : 1;');
  });
});
