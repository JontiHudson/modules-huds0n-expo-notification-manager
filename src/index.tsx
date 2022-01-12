import { NotificationStateClass } from "./NotificationStateClass";
import type { Types } from "./types";

export function createNotificationManager(options?: Types.Options) {
  return new NotificationStateClass(options);
}

export type { Types as NotificationTypes } from "./types";
