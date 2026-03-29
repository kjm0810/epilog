import db from "@/utils/db";
import { ensureReviewTable } from "@/utils/reviewTable";
import { NextApiRequest, NextApiResponse } from "next";

type ReviewRow = {
    review_index: number;
    work_index: number;
    user_index: number;
    nickname: string;
    rating: number;
    rewatch_intent: boolean;
    is_public: boolean;
    exp: string;
    content: string;
    created_at: string;
    updated_at: string;
};

type ReviewDbRow = Omit<ReviewRow, "rewatch_intent" | "is_public"> & {
    rewatch_intent: number | boolean;
    is_public: number | boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await ensureReviewTable();

        if (req.method === "GET") {
            const workIndex = Number(req.query.work_index);

            if (!workIndex || Number.isNaN(workIndex)) {
                return res.status(400).json({ error: "work_index는 필수입니다." });
            }

            const data = await db.query(
                `
                SELECT
                    review_index,
                    work_index,
                    user_index,
                    nickname,
                    rating,
                    rewatch_intent,
                    is_public,
                    exp,
                    content,
                    created_at,
                    updated_at
                FROM epilog_reviews
                WHERE work_index = ?
                  AND is_public = 1
                ORDER BY created_at DESC
            `,
                [workIndex]
            );

            const normalized = (data as ReviewDbRow[]).map((row) => ({
                ...row,
                rewatch_intent: Boolean(row.rewatch_intent),
                is_public: Boolean(row.is_public),
            }));

            return res.status(200).json({ data: normalized });
        }

        if (req.method === "POST") {
            const { work_index, user_index, nickname, rating, rewatch_intent, is_public, is_show, exp, content } = req.body as {
                work_index?: number;
                user_index?: number;
                nickname?: string;
                rating?: number;
                rewatch_intent?: boolean;
                is_public?: boolean;
                is_show?: boolean;
                exp?: string;
                content?: string;
            };

            const workIndex = Number(work_index);
            const userIndex = Number(user_index);
            const score = Number(rating);
            const userName = (nickname || `user_${userIndex}`).trim();
            const reviewExp = (exp || content || "").trim();
            const isPublic = typeof is_public === "boolean"
                ? is_public
                : typeof is_show === "boolean"
                    ? is_show
                    : true;

            if (!workIndex || Number.isNaN(workIndex)) {
                return res.status(400).json({ error: "work_index는 필수입니다." });
            }

            if (!userIndex || Number.isNaN(userIndex)) {
                return res.status(400).json({ error: "user_index는 필수입니다." });
            }

            if (!userName) {
                return res.status(400).json({ error: "nickname은 필수입니다." });
            }

            if (!reviewExp) {
                return res.status(400).json({ error: "exp는 필수입니다." });
            }

            if (Number.isNaN(score) || score < 1 || score > 5) {
                return res.status(400).json({ error: "rating은 1~5 사이여야 합니다." });
            }

            const result = await db.execute(
                `
                INSERT INTO epilog_reviews (work_index, user_index, nickname, rating, rewatch_intent, is_public, exp, content)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [workIndex, userIndex, userName, score, Number(Boolean(rewatch_intent)), Number(isPublic), reviewExp, reviewExp]
            );

            const insertedRows = await db.query(
                `
                SELECT
                    review_index,
                    work_index,
                    user_index,
                    nickname,
                    rating,
                    rewatch_intent,
                    is_public,
                    exp,
                    content,
                    created_at,
                    updated_at
                FROM epilog_reviews
                WHERE review_index = ?
                LIMIT 1
            `,
                [result.insertId]
            );

            const inserted = (insertedRows as ReviewDbRow[])[0];

            if (!inserted) {
                return res.status(500).json({ error: "리뷰 생성 후 조회에 실패했습니다." });
            }

            return res.status(201).json({
                data: {
                    ...inserted,
                    rewatch_intent: Boolean(inserted.rewatch_intent),
                    is_public: Boolean(inserted.is_public),
                },
            });
        }

        return res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "리뷰 처리 중 오류가 발생했습니다." });
    }
}
