import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { envConfig } from 'src/config/configuration';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(MqttService.name);
  private _client: mqtt.MqttClient;

  onModuleInit() {
    const { BROKER_URL: brokerUrl, USERNAME: username, PASSWORD: password } = envConfig().MQTT;

    this._client = mqtt.connect(brokerUrl, {
      username,
      password,
      reconnectPeriod: 5000,
    });

    this._client.on('connect', () => {
      this._logger.log(`Connected to MQTT broker at ${brokerUrl}`);
    });

    this._client.on('error', (err) => {
      this._logger.error(`MQTT error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this._client) {
      this._client.end();
    }
  }

  /**
   * Publish a task-created notification to the user's personal topic.
   * Topic pattern: tasks/notifications/{userId}
   */
  publishTaskCreated(userId: string, task: { id: string; title: string }): void {
    const topic = `tasks/notifications/${userId}`;
    const payload = JSON.stringify({
      event: 'TASK_CREATED',
      taskId: task.id,
      title: task.title,
      timestamp: new Date().toISOString(),
    });

    this._client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        this._logger.error(`Failed to publish MQTT message: ${err.message}`);
      } else {
        this._logger.log(`Published task notification to ${topic}`);
      }
    });
  }

  publishTaskUpdated(userId: string, task: { id: string; title: string }): void {
    const topic = `tasks/notifications/${userId}`;
    const payload = JSON.stringify({
      event: 'TASK_UPDATED',
      taskId: task.id,
      title: task.title,
      timestamp: new Date().toISOString(),
    });

    this._client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        this._logger.error(`Failed to publish MQTT message: ${err.message}`);
      } else {
        this._logger.log(`Published task update notification to ${topic}`);
      }
    });
  }

  publishTaskDeleted(userId: string, task: { id: string; title: string }): void {
    const topic = `tasks/notifications/${userId}`;
    const payload = JSON.stringify({
      event: 'TASK_DELETED',
      taskId: task.id,
      title: task.title,
      timestamp: new Date().toISOString(),
    });

    this._client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        this._logger.error(`Failed to publish MQTT message: ${err.message}`);
      } else {
        this._logger.log(`Published task deletion notification to ${topic}`);
      }
    });
  }

  subscribe(topic: string, callback: (payload: string) => void): void {
    this._client.subscribe(topic, { qos: 1 });
    this._client.on('message', (t, message) => {
      if (t === topic) {
        callback(message.toString());
      }
    });
  }
}
