import { User, seedUser } from '~/models/user.server';
import bcrypt from 'bcryptjs';

// Call seedUser() once on server start
seedUser();

export async function verifyLogin(username: string, password: string) {
  const user = await User.findOne({ username });
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}