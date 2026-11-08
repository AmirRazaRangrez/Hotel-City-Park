# Hotel City Park CRM — Comprehensive QA Test Cases Specification
**Document Version:** 2.0 (Post-Release Build)  
**Target Environment:** Windows Desktop (Electron) & Web  
**Tester Name:** _____________________ | **Date of Execution:** _____________________

---

## Quick Navigation
1. [Suite 1: Recent Fixes & Critical Verification](#suite-1-recent-fixes--critical-verification)
2. [Suite 2: Front Office — Guest Check-In & Registration](#suite-2-front-office--guest-check-in--registration)
3. [Suite 3: Room Folio, In-Stay Operations & Extra Charges](#suite-3-room-folio-in-stay-operations--extra-charges)
4. [Suite 4: Check-Out, Billing, & Tax Invoice Verification](#suite-4-check-out-billing--tax-invoice-verification)
5. [Suite 5: Room Occupancy Chart & Room Grid Management](#suite-5-room-occupancy-chart--room-grid-management)
6. [Suite 6: Cash Handover Statements (Front Office & F&B)](#suite-6-cash-handover-statements-front-office--fb)
7. [Suite 7: F&B POS — Restaurant & Bar Operations](#suite-7-fb-pos--restaurant--bar-operations)
8. [Suite 8: Store Inventory & Vendor Payments](#suite-8-store-inventory--vendor-payments)
9. [Suite 9: User Management, Roles & Section Passwords](#suite-9-user-management-roles--section-passwords)
10. [Suite 10: Database Integrity, Firebase Cloud Sync & Offline Resilience](#suite-10-database-integrity-firebase-cloud-sync--offline-resilience)

---

## Suite 1: Recent Fixes & Critical Verification
*Verify all newly updated behaviors, print adjustments, and bug fixes.*

### TC-REC-01: Tax Invoice Discount Label Format
* **Priority:** Critical
* **Pre-condition:** Room checked in with a tariff discount applied (e.g., 100% or ₹730).
* **Steps:**
  1. Open Room Folio or Check-Out Modal for the discounted room.
  2. Settle the room and trigger the final Tax Invoice print preview.
  3. Inspect the discount row on the invoice.
* **Expected Result:**
  * Label reads strictly **`Less Discount `** (with NO percentage like `@100.00%` or `@25%`).
  * Discount amount is correctly formatted and subtracted.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-02: Money Receipt Description Casing ("Paid While Checkout")
* **Priority:** High
* **Pre-condition:** Settle checkout payment using Cash, Card, or UPI.
* **Steps:**
  1. Complete check-out payment.
  2. Open the resulting Money Receipt print/preview dialog.
  3. Inspect the Description text under the particulars table.
* **Expected Result:**
  * The description displays strictly in Title Case: **`Paid While Checkout`** (not lowercase "paid while checkout").
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-03: Occupancy Chart Top Header 3-Column Layout & Deduplication
* **Priority:** High
* **Pre-condition:** 2 or more rooms occupied (including multi-guest bookings).
* **Steps:**
  1. Click **Occupancy Chart** button in Hospitality toolbar.
  2. Inspect the top header layout in the modal and print preview.
  3. Check the room numbers listed in each category.
* **Expected Result:**
  * **Left Side:** Displays `Occupied (count): [list]` and `Maintenance (count): [list]`.
  * **Center:** Displays `HOTEL CITY PARK` header and `ROOM OCCUPANCY CHART` subtitle.
  * **Right Side:** Displays `AS ON [Date] [Time]` and `Vacant / Ready (count): [list]`.
  * **No Duplicate Room Numbers:** Each room number appears strictly once (e.g., Room 505 never repeats as "505, 505").
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-04: Occupancy Chart Single-Click Print Guarantee
* **Priority:** Medium
* **Steps:**
  1. Open the Occupancy Chart modal.
  2. Click the **Print Occupancy Chart** button once.
* **Expected Result:**
  * The system print dialog opens exactly **once**.
  * No duplicate or stacked print popups appear.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-05: Receipt PDF Border & Styling Consistency
* **Priority:** High
* **Steps:**
  1. Generate a Money Receipt or download automatic receipt PDF.
  2. Open the downloaded PDF in Acrobat Reader or browser.
* **Expected Result:**
  * Clean, crisp borders without abnormally thick or heavy black lines.
  * The layout matches the print preview exactly (Original Copy on Top, Hotel Copy on Bottom).
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-06: Accurate Pax Count on History Tax Invoice Reprints (Group & Single Rooms)
* **Priority:** Critical
* **Pre-condition:** Room checked out from History, or multi-room group booking checked out (e.g., Rooms 502 & 506 with 6 adults).
* **Steps:**
  1. Navigate to **Hospitality History** table (`/hospitality` -> History tab).
  2. Locate a checked-out booking and click **Documents / Tax Invoice** reprint.
  3. Inspect the `Pax:` field in the top right metadata block of the printed A4 Tax Invoice.
* **Expected Result:**
  * For single rooms: Displays true number of guests (e.g., `Pax: 2` or `Pax: 3`), **NEVER defaults or falls back to 1 Pax**.
  * For linked group bookings: Accurately aggregates the full guest count across all rooms in the group (e.g., `Pax: 6` across Rooms 502 & 506).
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-07: Extra Hours Slot Tiers on Tax Invoice (1–3h, 3–6h, 6–9h, & >9h Rollover)
* **Priority:** Critical
* **Pre-condition:** Guest check-out delayed beyond checkout time.
* **Steps:**
  1. Test 1 (1–3 Hours): Guest extends checkout by 2 hours.
  2. Test 2 (3–6 Hours): Guest extends checkout by 5 hours.
  3. Test 3 (6–9 Hours): Guest extends checkout by 8 hours.
  4. Test 4 (>9 Hours): Guest extends checkout by 12 hours.
* **Expected Result:**
  * Test 1 prints: `Extra Hours Charge (1–3 Hours)` with configured tier rate (e.g., ₹500.00).
  * Test 2 prints: `Extra Hours Charge (3–6 Hours)` with configured tier rate (e.g., ₹1,000.00).
  * Test 3 prints: `Extra Hours Charge (6–9 Hours)` with configured tier rate (e.g., ₹1,500.00).
  * Test 4 (>9 Hours): Automatically converts to **1 full day of room tariff** under Room Tariff, and completely **suppresses the hourly line item**.
  * Zero-extension stays (0 hours or normal checkout) show **no Extra Hours row** (0.00 row is hidden).
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-08: Tax Invoice Math Reconciliation with Check-in Discount & Extensions
* **Priority:** Critical
* **Pre-condition:** 1-day stay (Room ₹2,350 + Breakfast ₹500 = ₹2,850) with 10% check-in discount + 1–3h extension (₹500).
* **Steps:**
  1. Open Room Folio or Checkout Modal for Room 407.
  2. Generate and inspect the final Tax Invoice.
* **Expected Result:**
  * **Less Discount (10%):** Strictly `-₹285.00` (10% of stay base ₹2,850), **NEVER -₹335.00**.
  * **Day 1 Effective Tariff:** `₹2,565.00` (₹2,850 - ₹285).
  * **Day 1 CGST / SGST:** `₹64.13` and `₹64.12` (5% GST on ₹2,565).
  * **Day 1 Room Bill Total:** `₹2,693.25`.
  * **Extension Column (08/11):** `₹500.00` + `₹12.50` CGST + `₹12.50` SGST = `₹525.00`.
  * **Table Column Sum:** ₹2,693.25 + ₹525.00 = **`₹3,218.25`** (Total column matches column sum exactly; **zero ₹500 double counting**).
  * **Round-off:** `-₹0.25` -> **Invoice Total: `₹3,218.00`**.
  * **Net Payable:** ₹3,218.00 - ₹1,347.00 Advance = **`₹1,871.00`** (NEVER ₹2,344.00).
  * **In Words:** Matches printed figures to the exact rupee.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-09: Single-Page A4 Tax Invoice Strict Height & Layout Guarantee
* **Priority:** High
* **Steps:**
  1. Open Tax Invoice for any single-room or multi-room stay (up to 10 days).
  2. Press Ctrl+P or open Print Preview in Chrome/Edge/Electron.
* **Expected Result:**
  * Page count indicator reads strictly **"1 page"** (never overflows to a blank or 2nd page).
  * Watermark logo is centered with contrast.
  * Header (Hotel details on left, logo on right) and Footer (Bank details on left, signature blocks on right) are perfectly aligned.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-REC-10: Dual-Drive Redundant Database Auto-Backups (C:\ & D:\ Drives)
* **Priority:** High
* **Steps:**
  1. Inspect backup service log on server startup.
  2. Check backup folder in `C:\Aamir Delta\city_backup\backups` and `D:\HCP_Backups` (if D: exists).
* **Expected Result:**
  * `[BackupService] Dual-Drive Redundant Backup service initialized (C:\ & D:\)` logged.
  * Automated SQLite timestamped snapshots created without locking active database.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 2: Front Office — Guest Check-In & Registration

### TC-CHK-01: Standard Walk-in Check-in Flow
* **Priority:** Critical
* **Steps:**
  1. Click on any Green (Vacant/Ready) room card on the grid.
  2. Enter Guest Name, Mobile Number, Address, and Pax (Adults/Children).
  3. Set Base Tariff and Meal Plan (EP/CP/MAP/AP).
  4. Enter Advance payment (e.g., ₹2,000 via Cash).
  5. Click **Check In**.
* **Expected Result:**
  * Room card immediately turns Red (Occupied) with guest name and check-in timestamp.
  * Guest Registration Card print preview opens with all details populated.
  * An advance money receipt is generated with valid CR serial number.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-CHK-02: OTA / Pre-booked Check-in
* **Priority:** High
* **Steps:**
  1. Select an incoming OTA reservation (MakeMyTrip, Booking.com, Goibibo).
  2. Click Check-in.
  3. Verify OTA booking ID, Channel rate, and prepaid status.
  4. Complete check-in.
* **Expected Result:**
  * Room card shows OTA badge/indicator.
  * Prepaid balance is recorded properly without forcing front-office advance collection.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-CHK-03: Room Transfer / Shifting
* **Priority:** Medium
* **Steps:**
  1. Open an occupied room folio.
  2. Click **Transfer Room**.
  3. Select another vacant room of same type or higher category.
  4. Confirm transfer.
* **Expected Result:**
  * Previous room switches to Dirty/Vacant.
  * New room becomes Occupied with all prior folio charges, advances, and KOT bills preserved.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 3: Room Folio, In-Stay Operations & Extra Charges

### TC-FOL-01: Posting In-Stay Payments ("Paid While Living")
* **Priority:** High
* **Steps:**
  1. Open an occupied room folio.
  2. Click **Add Payment / Advance**.
  3. Enter ₹1,000 Cash and save.
* **Expected Result:**
  * Total Advance/Paid increases by ₹1,000.
  * Money Receipt prints with description: `"Paid while Living"`.
  * Remaining Balance Due recalculates in real-time.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-FOL-02: Extra Bed / Mattress Charges
* **Priority:** High
* **Steps:**
  1. Inside Room Folio, click **Add Extra Bed/Mattress**.
  2. Select Extra Mattress, enter rate (e.g. ₹500 + GST).
  3. Save charges.
* **Expected Result:**
  * Extra charges appear in the bill breakdown table with correct GST rate.
  * Gross Payable Amount increases accordingly.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-FOL-03: Room Service / Restaurant KOT Posting to Folio
* **Priority:** Critical
* **Steps:**
  1. In Restaurant POS or Waiter Panel, create a food order.
  2. Select **Transfer to Room** and pick an occupied room (e.g., 505).
  3. Punch the order.
* **Expected Result:**
  * The KOT bill immediately reflects under the "F&B / Restaurant Charges" section of Room 505 folio.
  * Folio balance due updates to include the food bill amount.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 4: Check-Out, Billing, & Tax Invoice Verification

### TC-OUT-01: Full Check-out Flow with Settlement
* **Priority:** Critical
* **Steps:**
  1. Open occupied Room Folio with remaining balance due.
  2. Click **Check Out / Settle Bill**.
  3. Choose payment mode: Cash / UPI / Card / Split.
  4. Settle the balance and finalize checkout.
* **Expected Result:**
  * Room switches from Occupied (Red) to Dirty/Cleaning (Yellow/Gray).
  * Final Tax Invoice generates with unique Invoice No. (HCP...).
  * Final receipt generated with `"Paid While Checkout"` label.
  * Net Payable becomes ₹0.00.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-OUT-02: Bill to Company (BTC) Check-out
* **Priority:** High
* **Steps:**
  1. On checkout settlement modal, select **Bill to Company (BTC)**.
  2. Select approved corporate account from dropdown.
  3. Confirm checkout without immediate cash collection.
* **Expected Result:**
  * Room checks out successfully.
  * Folio moves to Corporate Ledger / BTC Outstanding for credit settlement.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-OUT-03: Two Copies on Single Sheet Money Receipt
* **Priority:** High
* **Steps:**
  1. Print any money receipt.
  2. Inspect layout on standard A4 page.
* **Expected Result:**
  * Top half: **ORIGINAL** copy for guest.
  * Bottom half: **HOTEL COPY** for accounts.
  * Separated by a clear cut-line with scissor marker (`✂ CUT HERE`).
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 5: Room Occupancy Chart & Room Grid Management

### TC-GRD-01: Housekeeping Status Flow (Dirty -> Clean -> Ready)
* **Priority:** High
* **Steps:**
  1. Identify a room marked as **Dirty** after checkout.
  2. Click room card, assign cleaner or click **Mark as Clean / Ready**.
* **Expected Result:**
  * Room status turns Green (**Vacant / Ready**).
  * Room becomes available for new guest check-ins immediately.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-GRD-02: Maintenance Room Toggle
* **Priority:** Medium
* **Steps:**
  1. Select a vacant room and mark as **Under Maintenance**.
  2. Verify occupancy chart and grid.
  3. Release maintenance when complete.
* **Expected Result:**
  * Room cannot be checked in while under maintenance.
  * Listed under `Maintenance (count)` on Occupancy Chart header.
  * Restores to Vacant/Ready after releasing.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 6: Cash Handover Statements (Front Office & F&B)

### TC-CSH-01: Date & Shift Selection with Theme Styling
* **Priority:** Critical
* **Steps:**
  1. Open Front Office Cash Handover modal.
  2. Click the Date picker and change date to yesterday or another day.
  3. Click Shift dropdown and switch shifts (e.g. 7:00 AM - 7:00 PM, 7:00 PM - 7:00 AM, 7:00 AM - 3:00 PM, 3:00 PM - 11:00 PM, 11:00 PM - 7:00 AM).
* **Expected Result:**
  * Date picker and dropdown match the hotel application's dark/cream theme.
  * Changing date or shift immediately recalculates receipts and handover figures.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-CSH-02: Front Office Cash Handover Layout Order
* **Priority:** Critical
* **Steps:**
  1. In Front Office Cash Handover modal, inspect the **Right Side (DETAILS OF CASH HANDOVER)** column.
* **Expected Result:**
  * Rows appear in the exact required sequence from top to bottom:
    1. **Total Cash Receipts Rs.**
    2. **Expenses** (Owner / Staff petty expenses listed itemized)
    3. **Total Refund Rs.**
    4. **Net Handover to A/c.'s Rs.** (at the bottom, horizontally parallel with "To Handover Rs." on the left).
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-CSH-03: F&B Cash Handover Statement (No Refund Line)
* **Priority:** High
* **Steps:**
  1. Open Restaurant / F&B Cash Handover Statement.
  2. Inspect the right-side summary.
* **Expected Result:**
  * The "Refund" line is **completely removed** from the F&B handover statement.
  * "Net Handover to A/c.'s Rs." aligns parallel with "To Handover Rs."
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-CSH-04: Handover Print Layout & Signature Spacing
* **Priority:** High
* **Steps:**
  1. Click **Print Statement (2 Copies A4)** on Cash Handover.
  2. Inspect the print preview.
* **Expected Result:**
  * Two complete handover copies printed on single A4 sheet with cut line.
  * Ample comfortable spacing above `Signature of Paying Cashier`, `Sign of Receiving Cashier`, and `Sign of Accountant` for physical signatures.
  * No text overlapping boxes or cut lines.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 7: F&B POS — Restaurant & Bar Operations

### TC-POS-01: Table Order & KOT Generation
* **Priority:** Critical
* **Steps:**
  1. In Restaurant POS, click an empty table (e.g. T-04).
  2. Select food items from menu categories.
  3. Click **Print & Save KOT**.
* **Expected Result:**
  * Table turns Active/Occupied.
  * KOT slips print with KOT number, table number, waiter name, and timestamp.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-POS-02: Table Direct Cash/UPI Settlement
* **Priority:** High
* **Steps:**
  1. Open active table order.
  2. Click **Settle Bill**.
  3. Select Cash or UPI and confirm payment.
* **Expected Result:**
  * Table clears and turns Green (Empty).
  * Restaurant Tax Invoice prints.
  * Cash receipts sync to the F&B Cash Handover shift calculations.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 8: Store Inventory & Vendor Payments

### TC-STR-01: Vendor Creation & Purchase Bill Entry
* **Priority:** Medium
* **Steps:**
  1. Open Store / Inventory module.
  2. Add a new Vendor (Name, Mobile, Category).
  3. Create a Purchase Bill for the vendor (Bill No., Total Amount, Items).
* **Expected Result:**
  * Vendor appears in vendor list with current outstanding ledger.
  * Bill is saved and reflected under Vendor Accounts.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-STR-02: Recording Vendor Payment
* **Priority:** Medium
* **Steps:**
  1. Open Vendor Ledger.
  2. Record payment voucher (Payment mode, Reference No., Amount).
* **Expected Result:**
  * Vendor outstanding balance decreases by payment amount.
  * Payment receipt voucher generated.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 9: User Management, Roles & Section Passwords

### TC-USR-01: Role-Based Access Control
* **Priority:** High
* **Steps:**
  1. Log in with a Waiter or Cashier user account.
  2. Attempt to open Manager Accounting Analysis, Settings, or Delete Records.
* **Expected Result:**
  * Restricted sections prompt for Manager Password or display Access Denied.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 10: Database Integrity, Firebase Cloud Sync & Offline Resilience

### TC-DAT-01: App Launch Without Overwriting Existing Production Database
* **Priority:** Critical
* **Steps:**
  1. Ensure client database exists at `%APPDATA%\HotelCityPark\hotel_city_park.db`.
  2. Launch updated `Hotel City Park CRM.exe`.
* **Expected Result:**
  * The app loads the existing database immediately.
  * All past bookings, ongoing rooms, and guests are present.
  * The database is NOT replaced or overwritten with blank/demo data.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-DAT-02: Firebase Cloud Sync (Fresh Initial Sync)
* **Priority:** High
* **Steps:**
  1. Launch CRM desktop with an active internet connection.
  2. Check in a test guest or verify current occupied rooms.
  3. Open Owner Mobile App.
* **Expected Result:**
  * Active occupied rooms sync to Firestore collection `active_occupancies`.
  * Owner mobile app displays the live rooms and today's analytics accurately.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-DAT-03: Offline Resilience
* **Priority:** High
* **Steps:**
  1. Disconnect network cable / Wi-Fi on the desktop machine.
  2. Perform check-in, check-out, and print receipts.
* **Expected Result:**
  * All desktop operations (Billing, Check-in, Printing) work at full speed locally without errors.
  * When network reconnects, background sync pushes updates cleanly without blocking the UI.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Suite 11: Checkout Continuous Receipt Numbering, Admin Password Override & Tax Invoice Layout

### TC-CHK-05: Checkout Payment Receipt Continuous Serial Sequence
* **Priority:** Critical
* **Steps:**
  1. Complete stay settlement for any room with cash or UPI payment (e.g. ₹1,346).
  2. Confirm checkout in the Folio Settlement Modal.
  3. Inspect the printed settlement payment receipt.
  4. Compare with the record listed in History tab.
* **Expected Result:**
  * The checkout payment receipt displays the actual database continuous serial number (e.g. `CR11`, `CR12`, `UPI05`) instead of `#1` or `CR01`.
  * The receipt number matches the serial number shown in History.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-ADM-01: Admin Password Modal Override for Check-in Discount
* **Priority:** High
* **Steps:**
  1. In Check-in Wizard Step 6 (Stay), select a discount exceeding staff limit (e.g. 15% or 20%).
  2. In the discount permission dialog, click the **🔑 Enter Password** button.
  3. Enter the Manager / Admin password (e.g. `admin123`, `Jaijeet@123`, or manager account).
  4. Submit authorization.
* **Expected Result:**
  * Permission is immediately authorized on the spot without waiting for phone notification polling.
  * Requested discount applies to the check-in immediately with green toast confirmation.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-ADM-02: Admin Password Modal Override for Checkout Discount
* **Priority:** High
* **Steps:**
  1. Open Folio Settlement Modal for an occupied room.
  2. Enter a checkout discount (e.g. 10% or ₹300).
  3. Click the **🔑 Password** button next to *Request Admin Approval*.
  4. Enter Admin password and submit.
* **Expected Result:**
  * Admin authorization succeeds immediately.
  * Discount status switches to approved, recalculating the net balance due without delays.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-ADM-03: Admin Password Modal Override for Cross-Category Room Transfer
* **Priority:** High
* **Steps:**
  1. Drag an occupied room into an available room of a different category (e.g. Deluxe to Suite).
  2. In the Cross-Category Shift confirmation dialog, click **🔑 Password**.
  3. Enter Admin password and submit.
* **Expected Result:**
  * Room shift is authorized instantly.
  * System executes the transfer directly, preserving declared check-in tariff without requiring mobile approval.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-INV-07: Tax Invoice Watermark Repositioning (top: 57%)
* **Priority:** High
* **Steps:**
  1. Print Tax Invoice for any stay.
  2. Inspect the print preview.
* **Expected Result:**
  * Watermark background logo is positioned at `top: 57%`.
  * The text "HOTEL CityPaark" rests in the clear whitespace below Net Payable Amount in words and above the footer GST/Bank details.
  * No visual clash or overlapping with invoice total words, gross payable, advance received, or net payable figures.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

### TC-INV-08: Tax Invoice 3-Column Header (Centered Logo & Website QR Code)
* **Priority:** High
* **Steps:**
  1. Print Tax Invoice for any stay.
  2. Inspect the header section above the horizontal line.
* **Expected Result:**
  * **Left Column:** Hotel City Park address and contact details.
  * **Center Column:** Brand logo cleanly centered with "by JMG HOSPITALITY AND INFRA LLP".
  * **Right Column:** Crisp QR code with "Scan for Website" / `hotelcityparksolapur.com`.
  * Scanning the QR code with a phone redirects to `https://www.hotelcityparksolapur.com`.
  * Entire document remains strictly on 1 single A4 page.
* **Status:** `[ ] PASS` | `[ ] FAIL` | Notes: _____________________

---

## Summary Sign-off

| Total Test Cases | Passed | Failed | Blocked | Tester Signature | Sign-off Date |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **32** | ____ | ____ | ____ | ________________ | ____________ |

