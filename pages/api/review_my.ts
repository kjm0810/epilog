import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/utils/db";
import { ensureReviewTable } from "@/utils/reviewTable";
import { ensureAuthTables, verifyAccessToken } from "@/utils/auth";

type AccessUserRow = {
    user_index: number;
};

type ReviewStatusRow = {
    work_name: string;
    review_index: number | null;
    rating: number | null;
    rewatch_intent: number | boolean | null;
    is_public: number | boolean | null;
    exp: string | null;
};

function parseTokenFromRequest(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return req.cookies.accessToken ?? null;
}

function parseWorkIndex(queryValue: string | string[] | undefined): number | null {
    const raw = Array.isArray(queryValue) ? queryValue[0] : queryValue;
    const workIndex = Number(raw);

    if (!raw || Number.isNaN(workIndex) || workIndex <= 0) {
        return null;
    }

    return workIndex;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    }

    try {
        await ensureAuthTables();
        await ensureReviewTable();

        const workIndex = parseWorkIndex(req.query.work_index);

        if (!workIndex) {
            return res.status(400).json({ error: "work_index는 필수입니다." });
        }

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

        const reviewStatusRows = await db.query(
            `
            SELECT
                w.name AS work_name,
                r.review_index,
                r.rating,
                r.rewatch_intent,
                r.is_public,
                r.exp
            FROM epilog_works w
            LEFT JOIN epilog_reviews r
              ON r.work_index = w.work_index
             AND r.user_index = ?
            WHERE w.work_index = ?
            LIMIT 1
            `,
            [tokenUserIndex, workIndex]
        ) as ReviewStatusRow[];

        const reviewStatus = reviewStatusRows[0];

        if (!reviewStatus) {
            return res.status(404).json({ error: "작품을 찾을 수 없습니다." });
        }

        return res.status(200).json({
            data: {
                work_index: workIndex,
                work_name: reviewStatus.work_name,
                user_index: tokenUserIndex,
                has_reviewed: Boolean(reviewStatus.review_index),
                review_index: reviewStatus.review_index ?? null,
                rating: Number(reviewStatus.rating ?? 0),
                rewatch_intent: Boolean(reviewStatus.rewatch_intent ?? 0),
                is_public: Boolean(reviewStatus.is_public ?? 1),
                exp: reviewStatus.exp ?? "",
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "내 리뷰 조회 중 오류가 발생했습니다." });
    }
}
