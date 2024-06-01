import { Authenticator } from 'remix-auth';
import { FormStrategy } from 'remix-auth-form';
import { User } from '@prisma/client';
import { sessionStorage } from './session';
import { Password } from './utils/auth';
import db from '../db';

async function findUser(email: string, password: string): Promise<User | null> {
  const user = await db.user.findUnique({
    where: {
      email: email,
      password: password,
    },
  });

  return user;
}

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    // TODO: validation
    if (!email || !password) {
      throw new Error('Email or password not provided');
    }

    const hashedPassword = await Password.hash(password);

    const user = await findUser(email, hashedPassword);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return user;
  }),

  // Strategy name
  'user-pass',
);
