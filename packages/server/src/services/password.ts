import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPW(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function comparePW({
  receivedPassword,
  storedPassword,
}: {
  receivedPassword: string;
  storedPassword: string;
}): Promise<boolean> {
  const [hashedPassword, salt] = storedPassword.split('.');

  const hashedPasswordBuffer = Buffer.from(hashedPassword, 'hex');

  const receivedPasswordBuffer = (await scryptAsync(
    receivedPassword,
    salt,
    64,
  )) as Buffer;

  return timingSafeEqual(hashedPasswordBuffer, receivedPasswordBuffer);
}
