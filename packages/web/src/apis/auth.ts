import { API_URL } from '~/constants';

interface CommonAuthParams {
  email: string;
  password: string;
}
export const postSignIn = async ({ email, password }: CommonAuthParams) => {
  const res = await fetch(`${API_URL}/api/auth/signin`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to sign in');
  return res.json() as Promise<{
    result: boolean;
    expiresAt: number;
  }>;
};

interface SignUpParams extends CommonAuthParams {
  name: string;
  uuid: string;
}
export const postSignUp = async ({
  email,
  name,
  password,
  uuid,
}: SignUpParams) => {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ email, name, password, uuid }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to sign up');
  return res.json() as Promise<{
    result: boolean;
    expiresAt: number;
    user: { name: string; email: string; id: string; shortId: string };
  }>;
};

// TODO: make into a hook
export const postSignOut = async () => {
  const res = await fetch(`${API_URL}/api/auth/signout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Failed to sign out');
  return res.json() as Promise<{
    result: boolean;
  }>;
};
