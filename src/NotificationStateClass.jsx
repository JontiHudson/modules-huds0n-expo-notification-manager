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
        this._receivedNotifications = new Set();
        this._ToastComponent = options.ToastComponent || toast_1.Toast;
        this._initialize(options);
        this.cancelNotifications = this.cancelNotifications.bind(this);
        this.onPushTokenRetrieved = this.onPushTokenRetrieved.bind(this);
        this.scheduleNotification = this.scheduleNotification.bind(this);
        this.getBadge = this.getBadge.bind(this);
        this.setBadge = this.setBadge.bind(this);
        this.useBadge = this.useBadge.bind(this);
    }
    _initialize(options) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this._initializeNotificationStorage();
            this._handleBadge();
            this._handleCategories(options);
            this._handlePermissions(options);
            this._handlePushToken();
            this._handleScheduledNotification();
        });
    }
    _initializeNotificationStorage() {
        this._store = new shared_state_store_rn_1.SharedStateStore(this, {
            storeName: "__NotificationState",
            excludeKeys: ["badge", "permissionsGranted", "notificationCategories"],
        });
    }
    _handleBadge() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this.addListener(({ badge: newBadge }) => {
                Notifications === null || Notifications === void 0 ? void 0 : Notifications.setBadgeCountAsync(newBadge);
            }, "badge");
            react_native_1.AppState.addEventListener("change", (nextAppState) => {
                if (nextAppState === "active") {
                    this._initializeBadge();
                }
            });
            this._initializeBadge();
        });
    }
    _initializeBadge() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (Notifications) {
                const initialBadge = yield Notifications.getBadgeCountAsync();
                this.setState({ badge: initialBadge });
            }
        });
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
    _handleCategories({ responseHandler = null, notificationCategories = [], }) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const notificationCategoriesWithDefaults = [
                ...defaults_1.DEFAULT_NOTIFICATION_CATEGORIES,
                ...notificationCategories,
            ];
            this.setState({
                responseHandler,
                notificationCategories: notificationCategoriesWithDefaults,
            });
            if (Notifications) {
                yield (0, utilities_1.asyncForEach)(notificationCategoriesWithDefaults, (notification) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                    yield Notifications.setNotificationCategoryAsync(notification.identifier, notification.actions, notification.options);
                }), false);
                yield Notifications.getNotificationCategoriesAsync();
            }
        });
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
                onTextSubmit: (text) => responseHandler === null || responseHandler === void 0 ? void 0 : responseHandler(identifier, notification, text),
            }
            : {
                label: buttonTitle,
                onPress: () => responseHandler === null || responseHandler === void 0 ? void 0 : responseHandler(identifier, notification),
            });
    }
    _handlePermissions({ iosPermissions }) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const DEFAULT_NOTIFICATION_PERMISSIONS = {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowAnnouncements: true,
            };
            if (Notifications) {
                yield Notifications.requestPermissionsAsync({
                    ios: iosPermissions || DEFAULT_NOTIFICATION_PERMISSIONS,
                });
            }
            this._handlePermissionsStatus();
            react_native_1.AppState.addEventListener("change", (nextAppState) => {
                if (nextAppState === "active") {
                    this._handlePermissionsStatus();
                }
            });
        });
    }
    _handlePermissionsStatus() {
        var _a;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (Notifications) {
                const settings = yield Notifications.getPermissionsAsync();
                this.setState({
                    permissionsGranted: settings.granted ||
                        ((_a = settings.ios) === null || _a === void 0 ? void 0 : _a.status) ===
                            Notifications.IosAuthorizationStatus.PROVISIONAL,
                });
            }
        });
    }
    _handlePushToken() {
        let removeNetworkListener;
        const pushTokenGet = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const { isConnected } = yield netinfo_1.default.fetch();
            if (!isConnected) {
                removeNetworkListener = netinfo_1.default.addEventListener(pushTokenGet);
                return;
            }
            try {
                if (Notifications) {
                    const expoPushToken = yield Notifications.getExpoPushTokenAsync();
                    const newPushToken = expoPushToken.data.substr(18, 22);
                    this.setState({ pushToken: newPushToken });
                }
                this._store.save();
                removeNetworkListener === null || removeNetworkListener === void 0 ? void 0 : removeNetworkListener();
            }
            catch (error) {
                error_1.default.transform(error, {
                    code: "EXPO_PUSH_TOKEN_ERROR",
                    message: "Unable to get push token",
                    severity: "LOW",
                    handled: true,
                });
            }
        });
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
    _updateScheduledNotifications() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (Notifications) {
                this.setState({
                    scheduledNotifications: (yield Notifications.getAllScheduledNotificationsAsync()),
                });
            }
        });
    }
    scheduleNotification(notification) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (Notifications) {
                yield Notifications.scheduleNotificationAsync(Object.assign(Object.assign({}, notification), { content: Object.assign(Object.assign({}, notification.content), { data: Object.assign(Object.assign({}, notification.content.data), { triggerJSON: JSON.stringify(notification.trigger) }) }) }));
            }
            yield this._updateScheduledNotifications();
        });
    }
    cancelNotifications(filterFn = () => true) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const { scheduledNotifications } = this.state;
            if (Notifications) {
                const promises = [];
                scheduledNotifications
                    .filter(filterFn)
                    .filter((notification) => !!notification.identifier)
                    .forEach((notification) => promises.push(Notifications.cancelScheduledNotificationAsync(notification.identifier)));
                yield Promise.all(promises);
            }
            yield this._updateScheduledNotifications();
        });
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
                this.setState(Object.assign({ lastNotification: notification }, (badgeUpdate !== undefined && { badge: badgeUpdate || 0 })));
                const { content: { title, body, data: { messageProps }, categoryIdentifier, }, } = notification;
                this._ToastComponent.display(Object.assign(Object.assign(Object.assign({ title, message: body || undefined }, messageProps), (categoryIdentifier && {
                    actions: this._categoryToButtons(categoryIdentifier, notification),
                })), { data: { notification } }));
                this._updateScheduledNotifications();
            });
            Notifications.addNotificationResponseReceivedListener((response) => {
                var _a, _b;
                const { actionIdentifier, userText } = response;
                const notification = response.notification
                    .request;
                const { content: { categoryIdentifier, data: { messageProps }, title, body, }, } = notification;
                if (categoryIdentifier &&
                    actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
                    const actions = this._categoryToButtons(categoryIdentifier, notification);
                    if (actions) {
                        this._ToastComponent.display(Object.assign(Object.assign({ title, message: body || undefined }, messageProps), { actions, data: { notification } }));
                    }
                }
                else {
                    (_b = (_a = this.state).responseHandler) === null || _b === void 0 ? void 0 : _b.call(_a, actionIdentifier, notification, userText);
                }
            });
        }
    }
}
exports.NotificationStateClass = NotificationStateClass;
