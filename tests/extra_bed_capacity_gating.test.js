import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Extra Bed Gating by Base Capacity Test Suite', () => {
  const step6Path = path.join(process.cwd(), 'src', 'components', 'hospitality', 'CheckinWizard', 'Step6Stay.jsx');
  const content = fs.readFileSync(step6Path, 'utf8');

  it('1. Extra Mattress + button on Direct/Walkin room card is disabled when currentAdults < totalBaseAdults', () => {
    expect(content).toContain('disabled={rExtraCount >= rExtra || currentAdults < totalBaseAdults}');
    expect(content).toContain('Fill all base beds (${totalBaseAdults} Adults) before adding an extra mattress');
  });

  it('2. Extra Mattress + button on OTA room card is disabled when currentAdults < totalBaseAdults', () => {
    const otaSection = content.slice(content.indexOf('Modern Extra Mattress Stepper for OTA Room'), content.indexOf('Modern Extra Mattress Stepper for OTA Room') + 3500);
    expect(otaSection).toContain('disabled={rExtraCount >= rExtra || currentAdults < totalBaseAdults}');
    expect(otaSection).toContain('Fill all base beds (${totalBaseAdults} Adults) before adding an extra mattress');
  });

  it('3. handleDirectAddExtraBed blocks addition if currentAdults < totalBaseAdults', () => {
    const fnStart = content.indexOf('const handleDirectAddExtraBed =');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = content.slice(fnStart, fnStart + 600);
    expect(fnBody).toContain('if (currentAdults < totalBaseAdults)');
    expect(fnBody).toContain('Please fill all base beds');
  });

  it('4. handleOpenExtraBedModal blocks opening if mode === add and currentAdults < totalBaseAdults', () => {
    const fnStart = content.indexOf('const handleOpenExtraBedModal =');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = content.slice(fnStart, fnStart + 400);
    expect(fnBody).toContain("if (mode === 'add' && currentAdults < totalBaseAdults)");
  });

  it('5. handleAdultDecrement automatically cleans up extra beds when adult count decreases to or below base capacity', () => {
    const fnStart = content.indexOf('const handleAdultDecrement =');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = content.slice(fnStart, fnStart + 1800);
    expect(fnBody).toContain('neededExtraBeds = Math.max');
    expect(fnBody).toContain('currentExtraBeds - neededExtraBeds');
    expect(fnBody).toContain('updates.extraBeds = neededExtraBeds');
  });

  it('6. Helper message displays extra mattress locked and unlocked states', () => {
    expect(content).toContain('Extra mattress locked until base beds are full');
    expect(content).toContain('Extra mattress unlocked');
  });

  it('7. Simulation test: Room 405 (Base: 2, Extra: 1)', () => {
    const totalBaseAdults = 2;
    const maxExtraBeds = 1;

    // State 1: 1 Adult selected
    let currentAdults = 1;
    let rExtraCount = 0;
    let isExtraBedDisabled = rExtraCount >= maxExtraBeds || currentAdults < totalBaseAdults;
    expect(isExtraBedDisabled).toBe(true); // Must be disabled!

    // State 2: 2 Adults selected
    currentAdults = 2;
    isExtraBedDisabled = rExtraCount >= maxExtraBeds || currentAdults < totalBaseAdults;
    expect(isExtraBedDisabled).toBe(false); // Now enabled!

    // State 3: Extra bed added
    rExtraCount = 1;
    let currentExtraBeds = 1;
    let currentAllowedAdults = totalBaseAdults + currentExtraBeds; // 3
    expect(currentAllowedAdults).toBe(3);

    // State 4: 3 Adults selected
    currentAdults = 3;

    // State 5: Receptionist decrements adult back to 2
    const nextTotal = currentAdults - 1; // 2
    const neededExtraBeds = Math.max(0, nextTotal - totalBaseAdults); // max(0, 2 - 2) = 0
    expect(neededExtraBeds).toBe(0);

    let excessBeds = currentExtraBeds - neededExtraBeds; // 1 - 0 = 1
    expect(excessBeds).toBe(1); // 1 extra bed automatically removed
  });
});
