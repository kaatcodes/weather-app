// app/models/auth.server.ts
import bcrypt from 'bcryptjs';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { User } from './user.server.js';
import { connectDb } from './db.server.js';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'weather_app_session',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export type LoginResult = {
  success: boolean;
  user?: any;
  error?: {
    type: 'username' | 'password' | 'unknown';
    message: string;
  };
};

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    console.log('Connecting to database...');
    await connectDb();
    
    console.log('Finding user...');
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found');
      return {
        success: false,
        error: {
          type: 'username',
          message: 'Username not found'
        }
      };
    }

    console.log('Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('Invalid password');
      return {
        success: false,
        error: {
          type: 'password',
          message: 'Invalid password'
        }
      };
    }

    console.log('Login successful');
    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: {
        type: 'unknown',
        message: 'An unexpected error occurred'
      }
    };
  }
}

export async function createUserSession(userId: string, redirectTo: string) {
  console.log('Creating session for user:', userId);
  const session = await storage.getSession();
  session.set('userId', userId);
  const cookie = await storage.commitSession(session);
  console.log('Session created, redirecting to:', redirectTo);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': cookie,
    },
  });
}

export async function getUserSession(request: Request) {
  return storage.getSession(request.headers.get('Cookie'));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get('userId');
  if (!userId || typeof userId !== 'string') return null;
  return userId;
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) return null;
    await connectDb();
    return User.findById(userId);
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect('/', {
    headers: {
      'Set-Cookie': await storage.destroySession(session),
    },
  });
} 