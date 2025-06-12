// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import mongoose from 'mongoose';

interface User {
  email: string;
  password: string;
}

const UserSchema = new mongoose.Schema<User>({ email: String, password: String });
const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await UserModel.findOne({ email });
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
