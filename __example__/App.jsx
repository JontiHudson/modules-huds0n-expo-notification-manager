"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const react_1 = (0, tslib_1.__importDefault)(require("react"));
const react_native_1 = require("react-native");
const components_1 = require("@huds0n/components");
const expo_notification_manager_1 = require("@huds0n/expo-notification-manager");
const inputs_1 = require("@huds0n/inputs");
const toast_1 = require("@huds0n/toast");
const NotificationManager = (0, expo_notification_manager_1.createNotificationManager)();
function NotificationManagerPlayground() {
    const [scheduledNotifications] = NotificationManager.useProp("scheduledNotifications");
    return (<toast_1.Toast>
      <react_native_1.SafeAreaView style={styles.safeAreaView}>
        <components_1.FlatList data={scheduledNotifications} ListHeaderComponent={<ListHeaderComponent />} renderItem={renderItem} keyName="identifier"/>
      </react_native_1.SafeAreaView>
    </toast_1.Toast>);
}
exports.default = NotificationManagerPlayground;
function renderItem({ item }) {
    const { content: { title, body, data: { triggerJSON }, }, } = item;
    const date = new Date(JSON.parse(triggerJSON).date);
    return (<react_native_1.View>
      <react_native_1.Text>{title}</react_native_1.Text>
      {body && <react_native_1.Text style={{ textAlign: "center" }}>{body}</react_native_1.Text>}
      <react_native_1.Text>{date.toLocaleDateString() + " " + date.toLocaleTimeString()}</react_native_1.Text>
    </react_native_1.View>);
}
function ListHeaderComponent() {
    const badgeInput = (0, inputs_1.useTextInput)({
        defaultValue: NotificationManager.getBadge().toString(),
        onValueChange: (value, error) => {
            NotificationManager.setBadge(error ? 0 : Number(value));
        },
    });
    return (<react_native_1.View>
      <components_1.Button onPress={badgeInput.focus}>
        <inputs_1.TextInput {...badgeInput} keyboardType="numeric" validator={inputs_1.validators.number({
            maxDecimals: 0,
            greaterThanOrEqual: 0,
        })} style={{ textAlign: "center", color: "blue" }}/>
      </components_1.Button>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    safeAreaView: {
        alignItems: "center",
        flex: 1,
        margin: 20,
    },
});
