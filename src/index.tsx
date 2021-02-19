import { NotificationStateClass } from './NotificationStateClass';
import * as NotificationTypes from './types';

export function createNotificationManager(options?: NotificationTypes.Options) {
  return new NotificationStateClass(options);
}

export { NotificationTypes };
