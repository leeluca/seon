import { Authenticator } from 'remix-auth';
import { FormStrategy } from 'remix-auth-form';
import { User } from '@prisma/client';
import { redirect } from '@remix-run/node';
import { sessionStorage } from './session';
import { Password } from './utils/auth';
import db from '../db';

async function findUser(name: string): Promise<User> {
  const user = await db.user.findUniqueOrThrow({
    where: {
      name,
    },
  });

  return user;
}

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const name = form.get('name') as string;
    const password = form.get('password') as string;

    // TODO: validation
    if (!name || !password) {
      throw new Error('Name or password not provided');
    }
    const user = await findUser(name);

    const passwordCorrect = await Password.compare({
      receivedPassword: password,
      storedPassword: user.password,
    });

    if (!passwordCorrect) {
      throw new Error('Invalid password');
    }

    return user;
  }),

  // Strategy name
  'user-pass',
);

export const checkAuth = async (request: Request) => {
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect('/login');
  }
  return user;
};
