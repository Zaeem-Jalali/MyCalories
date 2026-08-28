import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Exactly one notification type, opt-in, off by default — the reviews'
// biggest notification complaint was volume and irrelevance ("30 a day",
// "I don't care what Susie lost"), so there is nothing else to turn on.
const REMINDER_IDENTIFIER = "daily-log-reminder";

// expo-notifications has no web implementation at all (by design, per
// Expo's docs) — this app's real target is native, so the web preview
// just no-ops instead of crashing.
const SUPPORTED = Platform.OS !== "web";

export async function getDailyReminderTime(): Promise<{
  hour: number;
  minute: number;
} | null> {
  if (!SUPPORTED) return null;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminder = scheduled.find((n) => n.identifier === REMINDER_IDENTIFIER);
  const trigger = reminder?.trigger as { hour?: number; minute?: number } | null;
  if (!reminder || trigger?.hour === undefined) return null;
  return { hour: trigger.hour, minute: trigger.minute ?? 0 };
}

export async function setDailyReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  if (!SUPPORTED) return false;

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Daily reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: "Log today's food",
      body: "A quick photo or search keeps your day accurate.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  if (!SUPPORTED) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
}
