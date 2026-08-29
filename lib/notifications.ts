import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Exactly one notification type, opt-in, off by default — the reviews'
// biggest notification complaint was volume and irrelevance ("30 a day",
// "I don't care what Susie lost"), so there is nothing else to turn on.
const REMINDER_IDENTIFIER = "daily-log-reminder";
const REMINDER_CHANNEL = "reminders";

// expo-notifications has no web implementation at all (by design, per
// Expo's docs) — this app's real target is native, so the web preview
// just no-ops instead of crashing.
const SUPPORTED = Platform.OS !== "web";

export async function getDailyReminderTime(): Promise<{
  hour: number;
  minute: number;
} | null> {
  if (!SUPPORTED) return null;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminder = scheduled.find(
      (n) => n.identifier === REMINDER_IDENTIFIER,
    );
    // A DAILY trigger reads back as `{ hour, minute }` on Android but as an
    // iOS CalendarNotificationTrigger `{ dateComponents: { hour, minute } }`,
    // so check both shapes.
    const trigger = reminder?.trigger as {
      hour?: number;
      minute?: number;
      dateComponents?: { hour?: number; minute?: number };
    } | null;
    const hour = trigger?.hour ?? trigger?.dateComponents?.hour;
    const minute = trigger?.minute ?? trigger?.dateComponents?.minute ?? 0;
    if (!reminder || hour === undefined) return null;
    return { hour, minute };
  } catch (error) {
    // Reading the schedule can throw before notification permission has ever
    // been requested; treat that as "no reminder set" rather than crashing
    // the settings screen on mount. Logged so a genuine native failure is
    // still visible rather than silently read as "no reminder".
    console.warn("Could not read the scheduled reminder", error);
    return null;
  }
}

export async function setDailyReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  if (!SUPPORTED) return false;

  // The channel has to exist before anything is scheduled against it,
  // otherwise Android drops the notification into the default channel.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: "Daily reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: "Log today's food",
      body: "A quick photo or search keeps your day accurate.",
    },
    // DAILY is the cross-platform "every day at this time" trigger. A CALENDAR
    // trigger throws "Trigger of type: calendar is not supported on Android"
    // outright, so scheduling never even starts there.
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL } : {}),
    },
  });
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  if (!SUPPORTED) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
}
