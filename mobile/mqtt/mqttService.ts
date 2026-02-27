import mqtt from 'mqtt';

type NotificationCallback = (payload: {
  event: string;
  taskId: string;
  title: string;
  timestamp: string;
}) => void;

class MqttService {
  private client: mqtt.MqttClient | null = null;
  private subscribers: Map<string, NotificationCallback[]> = new Map();

  connect(brokerUrl: string, userId: string): void {
    if (this.client?.connected) return;

    this.client = mqtt.connect(brokerUrl, {
      clientId: `mobile_${userId}_${Date.now()}`,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      console.log('[MQTT] Connected');
      this.subscribeToUserTopic(userId);
    });

    this.client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        const callbacks = this.subscribers.get(topic) ?? [];
        callbacks.forEach((cb) => cb(payload));
      } catch (e) {
        console.error('[MQTT] Failed to parse message', e);
      }
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] Error:', err.message);
    });
  }

  private subscribeToUserTopic(userId: string): void {
    const topic = `tasks/notifications/${userId}`;
    this.client?.subscribe(topic, { qos: 1 });
  }

  onNotification(userId: string, callback: NotificationCallback): () => void {
    const topic = `tasks/notifications/${userId}`;
    const existing = this.subscribers.get(topic) ?? [];
    this.subscribers.set(topic, [...existing, callback]);

    return () => {
      const updated = (this.subscribers.get(topic) ?? []).filter((cb) => cb !== callback);
      this.subscribers.set(topic, updated);
    };
  }

  disconnect(): void {
    this.client?.end();
    this.client = null;
    this.subscribers.clear();
  }
}

export const mqttService = new MqttService();
