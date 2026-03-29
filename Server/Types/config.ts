export interface Config {
  JWT_SECRET: string;
  MONGODB_URL: string;
  PORT: number | string;
  NODE_ENV: string;
  JWT_EXPIRES_IN: string;
  LOG_LEVEL: string;
  REDIS_URL: string | null;
  CORS_ORIGIN: string;
  UPLOAD_MAX_SIZE: number | string;
  UPLOAD_PATH: string;
  SWAGGER_ENABLED: boolean | string;
  SWAGGER_ALLOWED_IP_ADDRESSES: string | null;
  APP_URL: string;
  SMTP_HOST: string | null;
  SMTP_PORT: number | string;
  SMTP_SECURE: string;
  SMTP_USER: string | null;
  SMTP_PASS: string | null;
  SMTP_FROM: string | null;
  EMAIL_PROVIDER: string;
  OCI_EMAIL_REGION: string | null;
  OCI_EMAIL_USER: string | null;
  OCI_EMAIL_PASS: string | null;
  OCI_EMAIL_FROM: string | null;
}
