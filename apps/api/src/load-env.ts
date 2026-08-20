import path from 'path';
import dotenv from 'dotenv';

const candidates = [
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const file of candidates) {
  dotenv.config({ path: file, override: false });
}
