import { createCookieSessionStorage, redirect } from '@remix-run/node';

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET not set');

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '_session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    secrets: [process.env.SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

export function getUserSession(request: Request) {
  return sessionStorage.getSession(request.headers.get('Cookie'));
}

export async function requireUser(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get('userId');
  if (!userId) throw redirect('/login');
  return userId;
}

export async function createUserSession(userId: string, redirectTo = '/') {
  const session = await sessionStorage.getSession();
  session.set('userId', userId);
  return redirect(redirectTo, {
    headers: { 'Set-Cookie': await sessionStorage.commitSession(session) },
  });
}