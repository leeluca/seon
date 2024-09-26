import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class Password {
  static async hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  static async compare({
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
}
