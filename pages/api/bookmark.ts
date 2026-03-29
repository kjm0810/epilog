import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/utils/db";
import { ensureBookmarkTable } from "@/utils/bookmarkTable";
import { ensureAuthTables, verifyAccessToken } from "@/utils/auth";

type AccessUserRow = {
    user_index: number;
};

type BookmarkCountRow = {
    bookmark_count: number;
};

type BookmarkStatusRow = {
    bookmark_index: number;
};

function parseTokenFromRequest(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return req.cookies.accessToken ?? null;
}

function parseWorkIndex(input: unknown): number | null {
    const raw = Array.isArray(input) ? input[0] : input;
    const workIndex = Number(raw);

    if (!raw || Number.isNaN(workIndex) || workIndex <= 0) {
        return null;
    }

    return workIndex;
}

async function resolveUserIndexByToken(token: string): Promise<number | null> {
    const payload = verifyAccessToken(token);

    if (!payload) {
        return null;
    }

    const tokenUserIndex = Number(payload.sub);

    if (!tokenUserIndex || Number.isNaN(tokenUserIndex)) {
        return null;
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

    return accessRows[0]?.user_index ?? null;
}

async function getBookmarkCount(workIndex: number): Promise<number> {
    const countRows = await db.query(
        `
        SELECT COUNT(bookmark_index) AS bookmark_count
        FROM epilog_bookmarks
        WHERE work_index = ?
        `,
        [workIndex]
    ) as BookmarkCountRow[];

    return countRows[0]?.bookmark_count ?? 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await ensureBookmarkTable();

        if (req.method === "GET") {
            const workIndex = parseWorkIndex(req.query.work_index);

            if (!workIndex) {
                return res.status(400).json({ error: "work_index는 필수입니다." });
            }

            const token = parseTokenFromRequest(req);
            let isBookmarked = false;

            if (token) {
                await ensureAuthTables();
                const userIndex = await resolveUserIndexByToken(token);

                if (userIndex) {
                    const bookmarkRows = await db.query(
                        `
                        SELECT bookmark_index
                        FROM epilog_bookmarks
                        WHERE work_index = ?
                          AND user_index = ?
                        LIMIT 1
                        `,
                        [workIndex, userIndex]
                    ) as BookmarkStatusRow[];

                    isBookmarked = Boolean(bookmarkRows[0]);
                }
            }

            const bookmarkCount = await getBookmarkCount(workIndex);

            return res.status(200).json({
                data: {
                    work_index: workIndex,
                    is_bookmarked: isBookmarked,
                    bookmark_count: bookmarkCount,
                },
            });
        }

        if (req.method === "POST" || req.method === "DELETE") {
            const workIndex = parseWorkIndex(req.body?.work_index);

            if (!workIndex) {
                return res.status(400).json({ error: "work_index는 필수입니다." });
            }

            await ensureAuthTables();

            const token = parseTokenFromRequest(req);

            if (!token) {
                return res.status(401).json({ error: "Access token is missing" });
            }

            const userIndex = await resolveUserIndexByToken(token);

            if (!userIndex) {
                return res.status(401).json({ error: "Invalid token" });
            }

            if (req.method === "POST") {
                await db.query(
                    `
                    INSERT INTO epilog_bookmarks (work_index, user_index)
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE
                        user_index = VALUES(user_index)
                    `,
                    [workIndex, userIndex]
                );
            } else {
                await db.query(
                    `
                    DELETE FROM epilog_bookmarks
                    WHERE work_index = ?
                      AND user_index = ?
                    `,
                    [workIndex, userIndex]
                );
            }

            const bookmarkCount = await getBookmarkCount(workIndex);

            return res.status(200).json({
                data: {
                    work_index: workIndex,
                    is_bookmarked: req.method === "POST",
                    bookmark_count: bookmarkCount,
                },
            });
        }

        return res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "북마크 처리 중 오류가 발생했습니다." });
    }
}
