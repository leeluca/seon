import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// import jwt from 'jsonwebtoken';

// import { config } from '../index.js';

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

// interface JwtPayload {
//   id: string;
//   email: string;
//   name: string;
// }

// export class JWT {
//   static sign({ id, email, name }: JwtPayload) {
//     const token = jwt.sign({ id, email, name }, config.JWT_SECRET, {
//       // TODO: reduce time to 15 min, add refresh token api
//       expiresIn: 60 * 60 * 24,
//     });

//     return token;
//   }

//   static verify(token: string) {
//     try {
//       const result = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

//       const { id, email, name } = result;

//       return { id, email, name };
//     } catch {
//       return null;
//     }
//   }
// }
