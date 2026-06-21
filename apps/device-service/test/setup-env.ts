import { config } from 'dotenv';
import { resolve } from 'path';

process.env.OTEL_SDK_DISABLED ??= 'true';

config({ path: resolve(__dirname, '.env.test') });
