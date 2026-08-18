# PharmaTel

PharmaTel is an Expo/React Native medication-management app with prescription,
dose, diary, observation, and pharmacy screens.

## Run

Install dependencies with `pnpm install`, then use the existing `dev` script.
The app reads the backend base URL from `EXPO_PUBLIC_API_URL`; without it, the
default is `http://localhost:8080/api`.

## Integration notes

- Prescription dose times are server-owned. The app displays and schedules
  notifications only for dose records that include a backend datetime
  (`takeAt`, `scheduledAt`, `schedule_at`, or the equivalent API field).
- The backend archive included with this project stores the value in
  `dose_schedule.scheduled_at`. Its DTO mapper must copy that value to the JSON
  response (`takeAt`) for the mobile app to receive it.