import * as dotenv from 'dotenv';
dotenv.config();

export function envConfig() {
    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT, 10) || 3000,
        PASSWORD_SALT: process.env.PASSWORD_SALT ? parseInt(process.env.PASSWORD_SALT, 10) : 12,
        JWT: {
            SECRET: process.env.JWT_SECRET,
            EXPIRATION: process.env.JWT_EXPIRATION,
            REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
            REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
        },
        REDIS: {
            HOST: process.env.REDIS_HOST || 'localhost',
            PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
            TTL: parseInt(process.env.REDIS_TTL, 10) || 3600,
            USER: process.env.REDIS_USER || '',
            PASSWORD: process.env.REDIS_PASSWORD || '',
        },
        MQTT: {
            BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
            USERNAME: process.env.MQTT_USERNAME,
            PASSWORD: process.env.MQTT_PASSWORD,
        },
    };
}
