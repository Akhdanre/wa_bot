# Reminder Module Design Specification

- **Date:** 2026-09-20
- **Status:** Approved
- **Scope:** Single-user / direct message reminder system for WhatsApp Bot (`whatsapp_bot`).
- **Phasing:**
  - **Phase 1:** Eat / Meal Reminders (configurable times per user in database).
  - **Phase 2:** Sholat / Prayer Reminders (integration with `equran.id` API, preserved design for future implementation).

---

## 1. Context & Motivation

The bot currently handles group statistics, tracking, and weekly summaries. Users need direct personal notifications to assist with daily habits:
1. Eating schedule adherence (breakfast, lunch, dinner).
2. Prayer time awareness based on their Indonesian location (provinsi & kab/kota).

The reminder module is isolated under `src/modules/reminder/` to keep existing modules (`message`, `scheduler`, `fishit`) decoupled while integrating through standard command routing in `MessageService` and client messaging through `whatsappClient`.

---

## 2. Architecture & File Structure

```text
src/modules/reminder/
├── reminder.repository.ts     # Prisma database queries for ReminderProfile
├── reminder.service.ts        # Meal evaluation, status formatting, and notification dispatch
├── reminder.scheduler.ts      # 1-minute node-cron schedule and dispatch guard
├── reminder.commands.ts       # Command parsing and validation (!reminder ...)
└── api/                       # (Phase 2)
    ├── equran.client.ts       # HTTP client for equran.id shalat endpoints
    └── equran.types.ts        # TypeScript interfaces for API requests/responses
```

### Module Responsibilities

1. **`reminder.repository.ts`**:
   - Manages upsert, update, and retrieval of `ReminderProfile` by `userId` or `waId`.
   - Queries active profiles where global and category flags are enabled (`enabled: true`, `mealEnabled: true`) and any meal time matches current `HH:mm`.

2. **`reminder.service.ts`**:
   - Evaluates active reminders for a given timestamp.
   - Dispatches WhatsApp text messages to target user's `waId`.
   - Generates formatted status summaries for the `!reminder status` command.

3. **`reminder.scheduler.ts`**:
   - Runs on a 1-minute cron cadence (`* * * * *`) targeting `Asia/Jakarta` timezone.
   - Prevents duplicate dispatches within the same minute window using an in-memory lock/timestamp set.
   - Delegates message payload composition and dispatch to `reminder.service.ts`.

4. **`reminder.commands.ts`**:
   - Handles `!reminder` subcommands routed from `MessageService`.
   - Validates input format (e.g., regex `^([01]\d|2[0-3]):([0-5]\d)$` or `off`).

---

## 3. Data Model

Prisma schema additions in `prisma/schema.prisma`:

```prisma
model ReminderProfile {
  id            Int      @id @default(autoincrement())
  userId        Int      @unique
  enabled       Boolean  @default(true)
  mealEnabled   Boolean  @default(true)
  breakfast     String?  // Format: "HH:mm" (e.g. "07:00") or null
  lunch         String?  // Format: "HH:mm" (e.g. "12:30") or null
  dinner        String?  // Format: "HH:mm" (e.g. "19:00") or null
  sholatEnabled Boolean  @default(false)
  provinsi      String?
  kabkota       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Update relation in `User` model:

```prisma
model User {
  // ... existing fields
  reminderProfile ReminderProfile?
}
```

---

## 4. Phase 1 Specification: Eat / Meal Reminders

### 4.1 Commands

Prefix: `!reminder` (also aliasable to `akr-reminder` to match codebase naming convention).

1. **Status:**
   - **Command:** `!reminder status`
   - **Output:** Current settings, master switch state, meal switch state, and configured times for breakfast, lunch, and dinner.
   - **Example:**
     ```text
     [Reminder Status]
     Master: ON
     Meal Reminders: ON
     - Breakfast: 07:00
     - Lunch: 12:30
     - Dinner: 19:00
     Sholat Reminders: OFF (Loc: -)
     ```

2. **Meal Time Configuration:**
   - **Command:** `!reminder meal <breakfast|lunch|dinner> <HH:mm|off>`
   - **Behavior:**
     - Validates meal slot (`breakfast`, `lunch`, `dinner`).
     - Validates time format (`HH:mm` 24-hour) or string `off`.
     - Upserts user profile; updates the targeted field to the specified time or `null` if `off`.
   - **Examples:**
     - `!reminder meal breakfast 07:30` -> Sets breakfast to 07:30.
     - `!reminder meal lunch off` -> Disables lunch reminder.

3. **Toggles:**
   - **Command:** `!reminder toggle <all|meal>`
   - **Behavior:**
     - `all`: Inverts `enabled` boolean.
     - `meal`: Inverts `mealEnabled` boolean.

### 4.2 Scheduler Logic

- **Cadence:** `* * * * *` (every minute).
- **Timezone:** `Asia/Jakarta` (WIB).
- **Execution Flow:**
  1. Retrieve current time in `HH:mm` string format based on `Asia/Jakarta`.
  2. Deduplication check: Guard execution key `${currentDate}_${currentHHmm}` to avoid double-processing if cron fires twice in transient conditions.
  3. Query `ReminderProfile` records:
     - `enabled == true`
     - `mealEnabled == true`
     - Condition: `breakfast == currentHHmm OR lunch == currentHHmm OR dinner == currentHHmm`
     - Include relation `user` to retrieve `user.waId`.
  4. Iterate profiles and dispatch personalized reminder message via `whatsappClient.sendMessage(user.waId, text)`.
  5. Log dispatch summary with standard logger.

---

## 5. Phase 2 Specification: Sholat / Prayer Reminders (Preserved)

### 5.1 equran.id API Integration

- **Base URL:** `https://equran.id/api/v2/shalat`
- **Endpoints:**
  1. **Get Provinces:**
     - Method: `GET https://equran.id/api/v2/shalat/provinsi`
     - Response: List of province names.
  2. **Get Regencies/Cities (Kab/Kota):**
     - Method: `POST https://equran.id/api/v2/shalat/kabkota`
     - Body: `{"provinsi": "<PROVINSI_NAME>"}`
     - Response: List of kab/kota names for the province.
  3. **Get Monthly Schedule:**
     - Method: `POST https://equran.id/api/v2/shalat`
     - Body: `{"provinsi": "<PROVINSI_NAME>", "kabkota": "<KABKOTA_NAME>", "bulan": N, "tahun": N}`
     - Response: Daily prayer times (`subuh`, `dzuhur`, `ashar`, `maghrib`, `isya`, etc.) for month `N` and year `N`.

### 5.2 Caching & Trigger Logic

- **Monthly Cache:** Store fetched monthly schedule locally in cache/database (`SholatScheduleCache` table or Redis/JSON cache) to minimize external API hits. Refresh on the 1st day of each month or upon location change.
- **Trigger Logic:**
  - Evaluates daily times against current `HH:mm`.
  - Sends alert for `subuh`, `dzuhur`, `ashar`, `maghrib`, and `isya`.
- **Commands:**
  - `!reminder loc <provinsi> | <kabkota>`: Set prayer calculation location with pipe delimiter.
  - `!reminder toggle sholat`: Enable or disable prayer alerts.

---

## 6. Error Handling & Edge Cases

1. **User Profile Absent:**
   - Auto-create `ReminderProfile` default record when user first runs a `!reminder` command.
2. **Invalid Time Formats:**
   - Strictly validate `HH:mm` format with regex `^(?:[01]\d|2[0-3]):[0-5]\d$`.
   - Reject invalid inputs (e.g. `25:00`, `9:00`, `abc`) with usage instructions.
3. **WhatsApp Client Disconnection:**
   - Wrap message dispatch in `try/catch`.
   - Log failures per recipient with `logger.error` without blocking other recipients in queue.
4. **Time Drift / Duplicate Execution:**
   - Minute-level execution tracking prevents firing twice during the same minute tick.

---

## 7. Verification & Test Plan

1. **Unit Tests:**
   - Time format validation helper (`HH:mm` parser).
   - Command argument parsing (`!reminder meal breakfast 07:00`).
   - Profile status text generator.
2. **Integration / Repository Tests:**
   - Upsert `ReminderProfile` when user exists.
   - Query matching active meal reminders for given `HH:mm`.
3. **Manual / End-to-End Verification:**
   - Send `!reminder meal breakfast <current_time + 1 min>`.
   - Wait 1 minute and verify message receipt on target WhatsApp user account.
   - Verify `!reminder status` reflects updated configurations.
   - Test toggle commands (`!reminder toggle meal`, `!reminder toggle all`) and ensure alerts are suppressed when toggled off.
