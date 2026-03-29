import db from "@/utils/db";
import { ensureReviewTable } from "@/utils/reviewTable";
import { ensureBookmarkTable } from "@/utils/bookmarkTable";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        await ensureReviewTable();
        await ensureBookmarkTable();
        const data = await db.query(`
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
                COUNT(r.review_index) AS review_count,
                COALESCE(ROUND(AVG(r.rating), 2), 0) AS rating_avg,
                COALESCE(bc.bookmark_count, 0) AS bookmark_count
            FROM epilog_works w
            LEFT JOIN epilog_reviews r ON r.work_index = w.work_index
            LEFT JOIN (
                SELECT
                    work_index,
                    COUNT(bookmark_index) AS bookmark_count
                FROM epilog_bookmarks
                GROUP BY work_index
            ) bc ON bc.work_index = w.work_index
            WHERE w.platform_id = 1
            GROUP BY
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
                bc.bookmark_count
            ORDER BY review_count DESC, rating_avg DESC, w.work_index DESC
            LIMIT 5
        `)

        return res.status(200).json({ data: data });
    }
    else {
        return res.status(500).json({ error: '잘못된 요청입니다.' });
    }
}
