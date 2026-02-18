import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Device.osName === "Android") {
    await Notifications.setNotificationChannelAsync("heliosinger-alerts", {
      name: "Heliosinger Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).easConfig?.projectId ||
    Constants.expoConfig?.extra?.projectId;

  const token = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  return token.data ?? null;
}
