import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { DoseSchedule, Prescription } from "@/models";

const DOSE_PREFIX = "pharmatel-dose-";
const ANDROID_CHANNEL = "dose-reminders";
const ANDROID_CATEGORY = "dose_reminder";
const ACTION_TAKEN = "TAKEN";
const ACTION_IGNORE = "IGNORE";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function doseNotificationIdentifier(
  prescriptionId: string,
  scheduledId: string,
  suffix?: string | number,
): string {
  return `${DOSE_PREFIX}${prescriptionId}__${scheduledId}${suffix != null ? `__${suffix}` : ""}`;
}

function isPrescriptionActive(rx: Prescription): boolean {
  if (rx.isDone) return false;
  if (!rx.doseSchedules.length) return false;
  const t = new Date().toISOString().split("T")[0];
  if (rx.startDate > t) return false;
  if (rx.endDate && rx.endDate < t) return false;
  return true;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: "Medication reminders",
    description: "PharmaTel dose alarms",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 250, 400, 250, 500],
    lightColor: "#0d9488",
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

async function ensureAndroidCategory() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationCategoryAsync(ANDROID_CATEGORY, [
    {
      identifier: ACTION_TAKEN,
      buttonTitle: "أخذت الدواء",
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_IGNORE,
      buttonTitle: "تجاهل",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

export async function cancelAllDoseNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(DOSE_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.warn("cancelAllDoseNotifications:", e);
  }
}

export async function syncDoseReminderNotifications(
  prescriptions: Prescription[],
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== "granted") return;

    await ensureAndroidChannel();
    await ensureAndroidCategory();
    await cancelAllDoseNotifications();

    for (const rx of prescriptions) {
      if (!isPrescriptionActive(rx)) continue;
      for (const ds of rx.doseSchedules) {
        await scheduleForDose(rx, ds);
      }
    }
  } catch (e) {
    console.warn("syncDoseReminderNotifications:", e);
  }
}

async function scheduleForDose(rx: Prescription, ds: DoseSchedule) {
  if (ds.status === "taken" || ds.status === "skipped") return;
  // The backend is the source of truth for dose timing. Do not create a
  // recurring local schedule from frequency or scheduledTime.
  if (!ds.takeAt) return;

  const scheduledId = ds.scheduledId != null ? String(ds.scheduledId) : ds.id;

  const body = `${rx.medicine.name} · ${rx.dose}`;
  const baseContent = {
    title: "💊 وقت الجرعة",
    subtitle: "PharmaTel reminder",
    body,
    data: { prescriptionId: rx.id, doseScheduleId: scheduledId },
    sound: true as const,
    categoryIdentifier: ANDROID_CATEGORY,
    ...(Platform.OS === "android"
      ? {
          channelId: ANDROID_CHANNEL,
          color: "#0d9488",
          priority: Notifications.AndroidNotificationPriority.MAX,
        }
      : {}),
  };

  const when = new Date(ds.takeAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: doseNotificationIdentifier(rx.id, scheduledId),
    content: baseContent,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
}
