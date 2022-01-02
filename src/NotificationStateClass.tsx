import { AppState, Platform } from 'react-native';
import * as NativeNotifications from 'expo-notifications';
import Constants from 'expo-constants';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';

import Huds0nError from '@huds0n/error';
import { SharedState } from '@huds0n/shared-state';
import { createStoreRN } from '@huds0n/shared-state-store-rn';
import { ToastTypes, Toast } from '@huds0n/toast';
import { asyncForEach } from '@huds0n/utilities';

import { DEFAULT_NOTIFICATION_CATEGORIES } from './defaults';
import * as Types from './types';

const Notifications = Platform.OS !== 'web' ? NativeNotifications : undefined;

export class NotificationStateClass extends SharedState<Types.NotificationStateType> {
  private _ToastComponent: any;
  private _receivedNotifications = new Set<string>();

  constructor(options: Types.Options = {}) {
    super({
      badge: 0,
      lastNotification: null,
      notificationCategories: [],
      permissionsGranted: null,
      pushToken: null,
      responseHandler: null,
      scheduledNotifications: [],
    });

    this._ToastComponent = options.ToastComponent || Toast;

    this._initialize(options);

    this.cancelNotifications = this.cancelNotifications.bind(this);
    this.onPushTokenRetrieved = this.onPushTokenRetrieved.bind(this);
    this.scheduleNotification = this.scheduleNotification.bind(this);
    this.getBadge = this.getBadge.bind(this);
    this.setBadge = this.setBadge.bind(this);
    this.useBadge = this.useBadge.bind(this);
  }

  private async _initialize(options: Types.Options) {
    await this._initializeNotificationStorage();

    this._handleBadge();
    this._handleCategories(options);
    this._handlePermissions(options);
    this._handlePushToken();
    this._handleScheduledNotification();
  }

  private async _initializeNotificationStorage() {
    await this.initializeStorage(
      createStoreRN({
        excludeKeys: ['badge', 'permissionsGranted', 'notificationCategories'],
        storeName: '__NotificationState',
      }),
    );
  }

  // Badge

  private async _handleBadge() {
    this.addListener('badge', ({ badge: newBadge }) => {
      Notifications?.setBadgeCountAsync(newBadge);
    });

    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this._initializeBadge();
      }
    });

    this._initializeBadge();
  }

  private async _initializeBadge() {
    if (Notifications) {
      const initialBadge = await Notifications.getBadgeCountAsync();
      this.setState({ badge: initialBadge });
    }
  }

  setBadge(value: number) {
    this.setState({ badge: value });
  }

  getBadge() {
    return this.state.badge;
  }

  useBadge() {
    return this.useProp('badge')[0];
  }

  // Categories

  private async _handleCategories({
    responseHandler = null,
    notificationCategories = [],
  }: Types.Options) {
    const notificationCategoriesWithDefaults = [
      ...DEFAULT_NOTIFICATION_CATEGORIES,
      ...notificationCategories,
    ];

    this.setState({
      responseHandler,
      notificationCategories: notificationCategoriesWithDefaults,
    });

    if (Notifications) {
      await asyncForEach(
        notificationCategoriesWithDefaults,
        async (notification) => {
          await Notifications.setNotificationCategoryAsync(
            notification.identifier,
            notification.actions,
            notification.options,
          );
        },
        false,
      );

      await Notifications.getNotificationCategoriesAsync();
    }
  }

  private _categoryToButtons(
    identifier: string,
    notification: Types.Notification,
  ): ToastTypes.Action[] | undefined {
    const { responseHandler, notificationCategories } = this.state;

    const category = notificationCategories.find(
      (category) => category.identifier === identifier,
    );

    if (!category) {
      return undefined;
    }

    return category.actions.map(({ buttonTitle, identifier, textInput }) =>
      textInput
        ? {
            label: buttonTitle,
            onTextSubmit: (text: string) =>
              responseHandler?.(identifier, notification, text),
          }
        : {
            label: buttonTitle,
            onPress: () => responseHandler?.(identifier, notification),
          },
    );
  }

  // Permissions

  private async _handlePermissions({ iosPermissions }: Types.Options) {
    const DEFAULT_NOTIFICATION_PERMISSIONS = {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowAnnouncements: true,
    };

    if (Notifications) {
      await Notifications.requestPermissionsAsync({
        ios: iosPermissions || DEFAULT_NOTIFICATION_PERMISSIONS,
      });
    }

    this._handlePermissionsStatus();

    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this._handlePermissionsStatus();
      }
    });
  }

  private async _handlePermissionsStatus() {
    if (Notifications) {
      const settings = await Notifications.getPermissionsAsync();

      this.setState({
        permissionsGranted:
          settings.granted ||
          settings.ios?.status ===
            Notifications.IosAuthorizationStatus.PROVISIONAL,
      });
    }
  }

  // Push Tokens

  private _handlePushToken() {
    let removeNetworkListener: NetInfoSubscription;

    const pushTokenGet = async () => {
      const { isConnected } = await NetInfo.fetch();

      if (!isConnected) {
        removeNetworkListener = NetInfo.addEventListener(pushTokenGet);
        return;
      }

      try {
        if (Notifications) {
          const expoPushToken = await Notifications.getExpoPushTokenAsync();
          const newPushToken = expoPushToken.data.substr(18, 22);

          this.setState({ pushToken: newPushToken });
        }
        this.save();

        removeNetworkListener?.();
      } catch (error) {
        Huds0nError.transform(error, {
          code: 'EXPO_PUSH_TOKEN_ERROR',
          message: 'Unable to get push token',
          severity: 'LOW',
          handled: true,
        });
      }
    };

    if (Constants.isDevice && !this.state.pushToken) {
      pushTokenGet();
    }
  }

  get pushToken() {
    return this.state.pushToken;
  }

  onPushTokenRetrieved(callback: (pushToken: string) => any) {
    if (this.pushToken) {
      callback(this.pushToken);
    } else {
      const removeListener = this.addListener('pushToken', ({ pushToken }) => {
        if (pushToken) {
          callback(pushToken);
          removeListener();
        }
      });
    }
  }

  // Scheduled Notifications

  private _handleScheduledNotification() {
    this._updateScheduledNotifications();

    this._listenForNotifications();

    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this._updateScheduledNotifications();
      }
    });
  }

  private async _updateScheduledNotifications() {
    if (Notifications) {
      this.setState({
        scheduledNotifications:
          (await Notifications.getAllScheduledNotificationsAsync()) as Types.Notification[],
      });
    }
  }

  async scheduleNotification(
    notification: NativeNotifications.NotificationRequestInput,
  ) {
    if (Notifications) {
      await Notifications.scheduleNotificationAsync({
        ...notification,
        content: {
          ...notification.content,
          data: {
            ...notification.content.data,
            triggerJSON: JSON.stringify(notification.trigger),
          },
        },
      });
    }
    await this._updateScheduledNotifications();
  }

  async cancelNotifications(
    filterFn: (notification: Types.Notification) => boolean = () => true,
  ) {
    const { scheduledNotifications } = this.state;

    if (Notifications) {
      const promises: Promise<any>[] = [];
      scheduledNotifications
        .filter(filterFn)
        .filter((notification) => !!notification.identifier)
        .forEach((notification) =>
          promises.push(
            Notifications.cancelScheduledNotificationAsync(
              notification.identifier,
            ),
          ),
        );

      await Promise.all(promises);
    }

    await this._updateScheduledNotifications();
  }

  private _listenForNotifications() {
    if (Notifications) {
      Notifications.addNotificationReceivedListener((received) => {
        const notification = received.request as Types.Notification;

        if (this._receivedNotifications.has(received.request.identifier)) {
          return;
        }

        this._receivedNotifications.add(received.request.identifier);

        const badgeUpdate = received.request.content.badge;

        this.setState({
          lastNotification: notification,
          ...(badgeUpdate !== undefined && { badge: badgeUpdate || 0 }),
        });

        const {
          content: {
            title,
            body,
            data: { messageProps },
            categoryIdentifier,
          },
        } = notification;

        this._ToastComponent.display({
          title,
          message: body || undefined,
          ...messageProps,
          ...(categoryIdentifier && {
            actions: this._categoryToButtons(categoryIdentifier, notification),
          }),
          data: { notification },
        });

        this._updateScheduledNotifications();
      });

      Notifications.addNotificationResponseReceivedListener((response) => {
        const { actionIdentifier, userText } = response;
        const notification = response.notification
          .request as Types.Notification;

        const {
          content: {
            categoryIdentifier,
            data: { messageProps },
            title,
            body,
          },
        } = notification;

        if (
          categoryIdentifier &&
          actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          const actions = this._categoryToButtons(
            categoryIdentifier,
            notification,
          );

          if (actions) {
            this._ToastComponent.display({
              title,
              message: body || undefined,
              ...messageProps,
              actions,
              data: { notification },
            });
          }
        } else {
          this.state.responseHandler?.(
            actionIdentifier,
            notification,
            userText,
          );
        }
      });
    }
  }
}
