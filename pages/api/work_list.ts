import db from "@/utils/db";
import { NextApiRequest, NextApiResponse } from "next";
import { ensureReviewTable } from "@/utils/reviewTable";
import { ensureBookmarkTable } from "@/utils/bookmarkTable";

type CountRow = {
    total: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    }

    try {
        await ensureReviewTable();
        await ensureBookmarkTable();

        const weekendRaw = Array.isArray(req.query.weekend) ? req.query.weekend[0] : req.query.weekend;
        const weekend = (weekendRaw || "all").trim();
        const keywordRaw = Array.isArray(req.query.keyword) ? req.query.keyword[0] : req.query.keyword;
        const keyword = (keywordRaw || "").trim();
        const pageRaw = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
        const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;

        const allowedWeekend = new Set(["all", "mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

        if (!allowedWeekend.has(weekend)) {
            return res.status(400).json({ error: "유효하지 않은 weekend 값입니다." });
        }

        const pageCandidate = Number(pageRaw ?? 1);
        const limitCandidate = Number(limitRaw ?? 24);
        const page = Number.isFinite(pageCandidate) && pageCandidate > 0 ? Math.floor(pageCandidate) : 1;
        const limit = Number.isFinite(limitCandidate) && limitCandidate > 0
            ? Math.min(Math.floor(limitCandidate), 60)
            : 24;
        const offset = (page - 1) * limit;

        const countRows = await db.query<CountRow>(
            `
            SELECT COUNT(*) AS total
            FROM epilog_works w
            WHERE (? = 'all' OR w.update_weekend LIKE CONCAT('%', ?, '%'))
              AND (
                  ? = ''
                  OR w.name LIKE CONCAT('%', ?, '%')
                  OR w.writer LIKE CONCAT('%', ?, '%')
                  OR COALESCE(w.genre, '') LIKE CONCAT('%', ?, '%')
              )
            `,
            [weekend, weekend, keyword, keyword, keyword, keyword]
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
            FROM epilog_works w
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
            WHERE (? = 'all' OR w.update_weekend LIKE CONCAT('%', ?, '%'))
              AND (
                  ? = ''
                  OR w.name LIKE CONCAT('%', ?, '%')
                  OR w.writer LIKE CONCAT('%', ?, '%')
                  OR COALESCE(w.genre, '') LIKE CONCAT('%', ?, '%')
              )
            ORDER BY
                (COALESCE(rc.review_count, 0) + COALESCE(bc.bookmark_count, 0)) DESC,
                w.name ASC,
                w.work_index ASC
            LIMIT ?
            OFFSET ?
            `,
            [weekend, weekend, keyword, keyword, keyword, keyword, limit, offset]
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
        return res.status(500).json({ error: "작품 목록 조회 중 오류가 발생했습니다." });
    }
}
