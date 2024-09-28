import { API_URL } from '~/constants';

interface SignInParams {
  email: string;
  password: string;
}
export const postSignIn = async ({ email, password }: SignInParams) => {
  const res = await fetch(`${API_URL}/api/auth/signin`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch sync credentials');
  return res.json() as Promise<{
    result: boolean;
    expiresAt: number;
  }>;
};
