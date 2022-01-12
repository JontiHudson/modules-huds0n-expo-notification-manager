import * as Notifications from "expo-notifications";

import { ToastTypes } from "@huds0n/toast";

export declare namespace Types {
  export type Notification = Notifications.NotificationRequest & {
    content: {
      categoryIdentifier?: string;
      title: string;
      data: {
        triggerJSON: string;
        messageProps?: ToastTypes.Message;
      };
      badge?: number | null;
    };
  };
  export type IosNotificationPermissions =
    Notifications.IosNotificationPermissionsRequest;

  type ResponseHandler =
    | ((
        actionIdentifer: string,
        notification: Notification,
        userText?: string
      ) => void)
    | null;

  export type Options = {
    responseHandler?: ResponseHandler;
    iosPermissions?: IosNotificationPermissions;
    notificationCategories?: Notifications.NotificationCategory[];
    ToastComponent?: any;
  };

  export type NotificationStateType = {
    responseHandler: ResponseHandler;
    badge: number;
    lastNotification: Notification | null;
    notificationCategories: Notifications.NotificationCategory[];
    permissionsGranted: null | boolean;
    pushToken: string | null;
    scheduledNotifications: Notification[];
  };
}
