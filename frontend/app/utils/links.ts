import { Linking, Alert } from 'react-native';

export const openTelegram = (channel: string) => {
  if (!channel) return;
  let cleanChannel = channel.replace('@', '').trim();
  const url = `https://t.me/${cleanChannel}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('خطا', 'امکان باز کردن لینک وجود ندارد');
  });
};
