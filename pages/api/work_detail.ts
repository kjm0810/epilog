import db from "@/utils/db";
import { ensureReviewTable } from "@/utils/reviewTable";
import { ensureBookmarkTable } from "@/utils/bookmarkTable";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const work_index = req.query.work_index;
        await ensureReviewTable();
        await ensureBookmarkTable();

        const data = await db.query(
            `
            SELECT
                w.*,
                COALESCE(rc.review_count, 0) AS review_count,
                COALESCE(rc.rating_avg, 0) AS rating_avg,
                COALESCE(bc.bookmark_count, 0) AS bookmark_count
            FROM epilog_works w
            LEFT JOIN (
                SELECT
                    work_index,
                    COUNT(review_index) AS review_count,
                    ROUND(AVG(rating), 2) AS rating_avg
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
            WHERE w.work_index = ?
            LIMIT 1
            `,
            [work_index]
        );

        return res.status(200).json({ data: data });
    }
    else {
        return res.status(500).json({ error: '잘못된 요청입니다.' });
    }
}
