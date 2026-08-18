---
name: Backend dose schedule contract
description: The mobile client must receive each server-generated dose datetime to render and notify reliably.
---

The backend is the source of truth for medication timing. A dose record must expose its persisted `scheduled_at` value through the API DTO (the current Java DTO names that JSON property `takeAt`); the client must not rebuild dates from frequency or a first-dose hour.

**Why:** Reconstructing a schedule on the device can disagree with server-generated rows, timezone handling, edits, and missed/taken state.

**How to apply:** When changing the backend mapper or API response, preserve the full datetime and keep the client notification path date-triggered and server-data-only.