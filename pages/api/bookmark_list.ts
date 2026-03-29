import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/utils/db";
import { ensureBookmarkTable } from "@/utils/bookmarkTable";
import { ensureAuthTables, verifyAccessToken } from "@/utils/auth";
import { ensureReviewTable } from "@/utils/reviewTable";

type AccessUserRow = {
    user_index: number;
};

type CountRow = {
    total: number;
};

function parseTokenFromRequest(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return req.cookies.accessToken ?? null;
}

function parsePositiveInt(
    value: string | string[] | undefined,
    fallback: number,
    maxValue: number
): number {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number(raw ?? fallback);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(Math.floor(parsed), maxValue);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    }

    try {
        await ensureAuthTables();
        await ensureReviewTable();
        await ensureBookmarkTable();

        const token = parseTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({ error: "Access token is missing" });
        }

        const payload = verifyAccessToken(token);

        if (!payload) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const tokenUserIndex = Number(payload.sub);

        if (!tokenUserIndex || Number.isNaN(tokenUserIndex)) {
            return res.status(401).json({ error: "Invalid token payload" });
        }

        const accessRows = await db.query(
            `
            SELECT user_index
            FROM epilog_access_users
            WHERE access_token = ?
              AND user_index = ?
              AND expires_at > NOW()
            LIMIT 1
            `,
            [token, tokenUserIndex]
        ) as AccessUserRow[];

        if (!accessRows[0]) {
            return res.status(401).json({ error: "Token not found or expired" });
        }

        const page = parsePositiveInt(req.query.page, 1, 1000000);
        const limit = parsePositiveInt(req.query.limit, 24, 60);
        const offset = (page - 1) * limit;

        const countRows = await db.query<CountRow>(
            `
            SELECT COUNT(*) AS total
            FROM epilog_bookmarks b
            WHERE b.user_index = ?
            `,
            [tokenUserIndex]
        );
        const total = Number(countRows[0]?.total ?? 0);

        const data = await db.query<Work>(
            `
            SELECT
                w.work_index,
                w.type,
                w.name,
                w.writer,
                w.genre,
                w.introduce,
                w.img_url,
                w.platform_id,
                w.update_weekend,
                w.status,
                w.link,
                COALESCE(rc.review_count, 0) AS review_count,
                COALESCE(rc.rating_avg, 0) AS rating_avg,
                COALESCE(bc.bookmark_count, 0) AS bookmark_count
            FROM epilog_bookmarks b
            INNER JOIN epilog_works w ON w.work_index = b.work_index
            LEFT JOIN (
                SELECT
                    work_index,
                    COUNT(review_index) AS review_count,
                    ROUND(AVG(CASE WHEN is_public = 1 THEN rating END), 2) AS rating_avg
                FROM epilog_reviews
                GROUP BY work_index
            ) rc ON rc.work_index = w.work_index
            LEFT JOIN (
                SELECT
                    work_index,
                    COUNT(bookmark_index) AS bookmark_count
                FROM epilog_bookmarks
                GROUP BY work_index
            ) bc ON bc.work_index = w.work_index
            WHERE b.user_index = ?
            ORDER BY b.created_at DESC, b.bookmark_index DESC
            LIMIT ?
            OFFSET ?
            `,
            [tokenUserIndex, limit, offset]
        );

        return res.status(200).json({
            data,
            pagination: {
                page,
                limit,
                total,
                hasMore: offset + data.length < total,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "북마크 작품 목록 조회 중 오류가 발생했습니다." });
    }
}
