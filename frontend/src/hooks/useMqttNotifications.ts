import { useEffect, useRef } from 'react';
import mqtt from 'mqtt';

export function useMqttNotifications(userId: string | undefined, onNotification: () => void) {
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const notificationRef = useRef(onNotification);

  useEffect(() => {
    notificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!userId) return;

    const brokerUrl = import.meta.env.VITE_MQTT_URL || 'ws://localhost:9001';
    const topic = `tasks/notifications/${userId}`;

    const client = mqtt.connect(brokerUrl, {
      clientId: `web_${userId}_${Date.now()}`,
      reconnectPeriod: 5000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      client.subscribe(topic, { qos: 1 });
    });

    client.on('message', (_topic, message) => {
      try {
        JSON.parse(message.toString());
        notificationRef.current();
      } catch (err) {
        console.info('[MQTT] not a valid message: ', err);
      }
    });

    client.on('error', (err) => {
      console.error('[MQTT] erro:', err.message);
    });

    return () => {
      client.end();
      clientRef.current = null;
    };
  }, [userId]);
}
