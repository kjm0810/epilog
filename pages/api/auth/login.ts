import type { NextApiRequest, NextApiResponse } from "next";
import {
    createUser,
    ensureAuthTables,
    findUserById,
    getTokenExpirationDate,
    saveAccessToken,
    signAccessToken,
    verifyPassword,
} from "@/utils/auth";

const ACCESS_TOKEN_COOKIE_KEY = "accessToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "지원하지 않는 메서드입니다." });
    }

    try {
        await ensureAuthTables();

        const { id, pw } = req.body as { id?: string; pw?: string };
        const inputId = (id || "").trim();
        const inputPw = (pw || "").trim();

        if (!inputId || !inputPw) {
            return res.status(400).json({ error: "id, pw는 필수입니다." });
        }

        let user = await findUserById(inputId);

        if (user) {
            const isMatch = verifyPassword(inputPw, user.pw);

            if (!isMatch) {
                return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
            }
        } else {
            user = await createUser(inputId, inputPw);

            if (!user) {
                return res.status(500).json({ error: "회원가입 처리에 실패했습니다." });
            }
        }

        const { accessToken, exp } = signAccessToken({
            sub: String(user.user_index),
            id: user.id,
        });

        const expiresAt = getTokenExpirationDate(exp);

        await saveAccessToken({
            userIndex: Number(user.user_index),
            accessToken,
            expiresAt,
        });

        res.setHeader(
            "Set-Cookie",
            `${ACCESS_TOKEN_COOKIE_KEY}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
        );

        return res.status(200).json({
            message: "로그인 성공",
            data: {
                user: {
                    user_index: user.user_index,
                    id: user.id,
                },
                accessToken,
                expiresAt: expiresAt.toISOString(),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
    }
}
