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

## Summary Sign-off

| Total Test Cases | Passed | Failed | Blocked | Tester Signature | Sign-off Date |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **26** | ____ | ____ | ____ | ________________ | ____________ |

