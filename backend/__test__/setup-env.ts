process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'integration-test-secret-key-32chars!!';
process.env.JWT_REFRESH_SECRET = 'integration-test-refresh-secret-32!!';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
process.env.PASSWORD_SALT = '10';
