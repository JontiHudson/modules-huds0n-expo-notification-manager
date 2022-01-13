"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationStateClass = void 0;
const tslib_1 = require("tslib");
const react_native_1 = require("react-native");
const NativeNotifications = (0, tslib_1.__importStar)(require("expo-notifications"));
const expo_constants_1 = (0, tslib_1.__importDefault)(require("expo-constants"));
const netinfo_1 = (0, tslib_1.__importDefault)(require("@react-native-community/netinfo"));
const error_1 = (0, tslib_1.__importDefault)(require("@huds0n/error"));
const shared_state_1 = require("@huds0n/shared-state");
const shared_state_store_rn_1 = require("@huds0n/shared-state-store-rn");
const toast_1 = require("@huds0n/toast");
const utilities_1 = require("@huds0n/utilities");
const defaults_1 = require("./defaults");
const Notifications = react_native_1.Platform.OS !== "web" ? NativeNotifications : undefined;
class NotificationStateClass extends shared_state_1.SharedState {
    _ToastComponent;
    _receivedNotifications = new Set();
    _store;
    constructor(options = {}) {
        super({
            badge: 0,
            lastNotification: null,
            notificationCategories: [],
            permissionsGranted: null,
            pushToken: null,
            responseHandler: null,
            scheduledNotifications: [],
        });
        this._ToastComponent = options.ToastComponent || toast_1.Toast;
        this._initialize(options);
        this.cancelNotifications = this.cancelNotifications.bind(this);
        this.onPushTokenRetrieved = this.onPushTokenRetrieved.bind(this);
        this.scheduleNotification = this.scheduleNotification.bind(this);
        this.getBadge = this.getBadge.bind(this);
        this.setBadge = this.setBadge.bind(this);
        this.useBadge = this.useBadge.bind(this);
    }
    async _initialize(options) {
        this._initializeNotificationStorage();
        this._handleBadge();
        this._handleCategories(options);
        this._handlePermissions(options);
        this._handlePushToken();
        this._handleScheduledNotification();
    }
    _initializeNotificationStorage() {
        this._store = new shared_state_store_rn_1.SharedStateStore(this, {
            storeName: "__NotificationState",
            excludeKeys: ["badge", "permissionsGranted", "notificationCategories"],
        });
    }
    async _handleBadge() {
        this.addListener(({ badge: newBadge }) => {
            Notifications?.setBadgeCountAsync(newBadge);
        }, "badge");
        react_native_1.AppState.addEventListener("change", (nextAppState) => {
            if (nextAppState === "active") {
                this._initializeBadge();
            }
        });
        this._initializeBadge();
    }
    async _initializeBadge() {
        if (Notifications) {
            const initialBadge = await Notifications.getBadgeCountAsync();
            this.setState({ badge: initialBadge });
        }
    }
    setBadge(value) {
        this.setState({ badge: value });
    }
    getBadge() {
        return this.state.badge;
    }
    useBadge() {
        return this.useProp("badge")[0];
    }
    async _handleCategories({ responseHandler = null, notificationCategories = [], }) {
        const notificationCategoriesWithDefaults = [
            ...defaults_1.DEFAULT_NOTIFICATION_CATEGORIES,
            ...notificationCategories,
        ];
        this.setState({
            responseHandler,
            notificationCategories: notificationCategoriesWithDefaults,
        });
        if (Notifications) {
            await (0, utilities_1.asyncForEach)(notificationCategoriesWithDefaults, async (notification) => {
                await Notifications.setNotificationCategoryAsync(notification.identifier, notification.actions, notification.options);
            }, false);
            await Notifications.getNotificationCategoriesAsync();
        }
    }
    _categoryToButtons(identifier, notification) {
        const { responseHandler, notificationCategories } = this.state;
        const category = notificationCategories.find((category) => category.identifier === identifier);
        if (!category) {
            return undefined;
        }
        return category.actions.map(({ buttonTitle, identifier, textInput }) => textInput
            ? {
                label: buttonTitle,
                onTextSubmit: (text) => responseHandler?.(identifier, notification, text),
            }
            : {
                label: buttonTitle,
                onPress: () => responseHandler?.(identifier, notification),
            });
    }
    async _handlePermissions({ iosPermissions }) {
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
        react_native_1.AppState.addEventListener("change", (nextAppState) => {
            if (nextAppState === "active") {
                this._handlePermissionsStatus();
            }
        });
    }
    async _handlePermissionsStatus() {
        if (Notifications) {
            const settings = await Notifications.getPermissionsAsync();
            this.setState({
                permissionsGranted: settings.granted ||
                    settings.ios?.status ===
                        Notifications.IosAuthorizationStatus.PROVISIONAL,
            });
        }
    }
    _handlePushToken() {
        let removeNetworkListener;
        const pushTokenGet = async () => {
            const { isConnected } = await netinfo_1.default.fetch();
            if (!isConnected) {
                removeNetworkListener = netinfo_1.default.addEventListener(pushTokenGet);
                return;
            }
            try {
                if (Notifications) {
                    const expoPushToken = await Notifications.getExpoPushTokenAsync();
                    const newPushToken = expoPushToken.data.substr(18, 22);
                    this.setState({ pushToken: newPushToken });
                }
                this._store.save();
                removeNetworkListener?.();
            }
            catch (error) {
                error_1.default.transform(error, {
                    code: "EXPO_PUSH_TOKEN_ERROR",
                    message: "Unable to get push token",
                    severity: "LOW",
                    handled: true,
                });
            }
        };
        if (expo_constants_1.default.isDevice && !this.state.pushToken) {
            pushTokenGet();
        }
    }
    get pushToken() {
        return this.state.pushToken;
    }
    onPushTokenRetrieved(callback) {
        if (this.pushToken) {
            callback(this.pushToken);
        }
        else {
            const removeListener = this.addListener(({ pushToken }) => {
                if (pushToken) {
                    callback(pushToken);
                    removeListener();
                }
            }, "pushToken");
        }
    }
    _handleScheduledNotification() {
        this._updateScheduledNotifications();
        this._listenForNotifications();
        react_native_1.AppState.addEventListener("change", (nextAppState) => {
            if (nextAppState === "active") {
                this._updateScheduledNotifications();
            }
        });
    }
    async _updateScheduledNotifications() {
        if (Notifications) {
            this.setState({
                scheduledNotifications: (await Notifications.getAllScheduledNotificationsAsync()),
            });
        }
    }
    async scheduleNotification(notification) {
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
    async cancelNotifications(filterFn = () => true) {
        const { scheduledNotifications } = this.state;
        if (Notifications) {
            const promises = [];
            scheduledNotifications
                .filter(filterFn)
                .filter((notification) => !!notification.identifier)
                .forEach((notification) => promises.push(Notifications.cancelScheduledNotificationAsync(notification.identifier)));
            await Promise.all(promises);
        }
        await this._updateScheduledNotifications();
    }
    _listenForNotifications() {
        if (Notifications) {
            Notifications.addNotificationReceivedListener((received) => {
                const notification = received.request;
                if (this._receivedNotifications.has(received.request.identifier)) {
                    return;
                }
                this._receivedNotifications.add(received.request.identifier);
                const badgeUpdate = received.request.content.badge;
                this.setState({
                    lastNotification: notification,
                    ...(badgeUpdate !== undefined && { badge: badgeUpdate || 0 }),
                });
                const { content: { title, body, data: { messageProps }, categoryIdentifier, }, } = notification;
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
                    .request;
                const { content: { categoryIdentifier, data: { messageProps }, title, body, }, } = notification;
                if (categoryIdentifier &&
                    actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
                    const actions = this._categoryToButtons(categoryIdentifier, notification);
                    if (actions) {
                        this._ToastComponent.display({
                            title,
                            message: body || undefined,
                            ...messageProps,
                            actions,
                            data: { notification },
                        });
                    }
                }
                else {
                    this.state.responseHandler?.(actionIdentifier, notification, userText);
                }
            });
        }
    }
}
exports.NotificationStateClass = NotificationStateClass;
