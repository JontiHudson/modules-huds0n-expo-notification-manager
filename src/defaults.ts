import * as Notifications from 'expo-notifications';

export const DEFAULT_NOTIFICATION_CATEGORIES: Notifications.NotificationCategory[] = [
  {
    identifier: 'YES_NO',
    actions: [
      { identifier: 'YES_NO.YES', buttonTitle: 'Yes' },
      { identifier: 'YES_NO.NO', buttonTitle: 'No' },
    ],
  },
  {
    identifier: 'REPLY',
    actions: [
      { identifier: 'REPLY.CANCEL', buttonTitle: 'Cancel' },
      {
        identifier: 'REPLY.INPUT',
        buttonTitle: 'Reply',
        textInput: { submitButtonTitle: 'Done', placeholder: '' },
      },
    ],
  },
];
