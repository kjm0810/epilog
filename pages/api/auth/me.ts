import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/utils/db';
import { ensureAuthTables, verifyAccessToken } from '@/utils/auth';

function parseTokenFromRequest(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return req.cookies.accessToken ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await ensureAuthTables();

    const token = parseTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Access token is missing' });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const rows = await db.query(
      `
      SELECT u.user_index, u.id
      FROM epilog_access_users au
      INNER JOIN epilog_user u ON u.user_index = au.user_index
      WHERE au.access_token = ?
        AND au.expires_at > NOW()
      LIMIT 1
      `,
      [token]
    ) as Array<{ user_index: number; id: string; }>;

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Token not found or expired' });
    }

    return res.status(200).json({
      user: {
        id: user.user_index,
        nickname: user.id,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch user information' });
  }
}
