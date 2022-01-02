import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Button, FlatList } from '@huds0n/components';
import {
  createNotificationManager,
  NotificationTypes,
} from '@huds0n/expo-notification-manager';
import { TextInput, useTextInput, validators } from '@huds0n/inputs';
import { Toast } from '@huds0n/toast';

const NotificationManager = createNotificationManager();

export default function NotificationManagerPlayground() {
  const [scheduledNotifications] = NotificationManager.useProp(
    'scheduledNotifications',
  );

  return (
    <Toast>
      <SafeAreaView style={styles.safeAreaView}>
        <FlatList
          data={scheduledNotifications}
          ListHeaderComponent={<ListHeaderComponent />}
          renderItem={renderItem}
          keyName="identifier"
        />
      </SafeAreaView>
    </Toast>
  );
}

function renderItem({
  item,
}: FlatList.ListRenderItemInfo<NotificationTypes.Notification>) {
  const {
    content: {
      title,
      body,
      data: { triggerJSON },
    },
  } = item;

  const date = new Date(JSON.parse(triggerJSON).date);

  return (
    <View>
      <Text>{title}</Text>
      {body && <Text style={{ textAlign: 'center' }}>{body}</Text>}
      <Text>{date.toLocaleDateString() + ' ' + date.toLocaleTimeString()}</Text>
    </View>
  );
}

function ListHeaderComponent() {
  const badgeInput = useTextInput({
    defaultValue: NotificationManager.getBadge().toString(),
    onValueChange: (value, error) => {
      NotificationManager.setBadge(error ? 0 : Number(value));
    },
  });

  return (
    <View>
      <Button onPress={badgeInput.focus}>
        <TextInput
          {...badgeInput}
          keyboardType="numeric"
          validation={validators.number({
            maxDecimals: 0,
            greaterThanOrEqual: 0,
          })}
          style={{ textAlign: 'center', color: 'blue' }}
        />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    alignItems: 'center',
    flex: 1,
    margin: 20,
  },
});
