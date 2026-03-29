import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import db from "@/utils/db";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type JwtPayload = {
    sub: string;
    id: string;
    exp: number;
    iat: number;
};

type AccessTokenPayload = {
    sub: string;
    id: string;
};

type AuthUserRow = {
    user_index: number;
    id: string;
    pw: string;
    created_at: string;
    updated_at: string;
};

function getJwtSecret() {
    return process.env.JWT_SECRET || "epilog-dev-secret-change-me";
}

function base64UrlEncode(input: string | Buffer) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Buffer.from(padded, "base64");
}

export function hashPassword(plainPassword: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = scryptSync(plainPassword, salt, 64).toString("hex");
    return `${salt}:${derived}`;
}

export function verifyPassword(plainPassword: string, storedPassword: string) {
    if (!storedPassword) {
        return false;
    }

    if (!storedPassword.includes(":")) {
        return plainPassword === storedPassword;
    }

    const [salt, hash] = storedPassword.split(":");

    if (!salt || !hash) {
        return false;
    }

    const derivedBuffer = scryptSync(plainPassword, salt, 64);
    const hashBuffer = Buffer.from(hash, "hex");

    if (derivedBuffer.length !== hashBuffer.length) {
        return false;
    }

    return timingSafeEqual(derivedBuffer, hashBuffer);
}

export function signAccessToken(payload: AccessTokenPayload, ttlSeconds = TOKEN_TTL_SECONDS) {
    const header = { alg: "HS256", typ: "JWT" };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + ttlSeconds;

    const body: JwtPayload = {
        ...payload,
        iat,
        exp,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(body));
    const unsigned = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac("sha256", getJwtSecret()).update(unsigned).digest();
    const encodedSignature = base64UrlEncode(signature);

    return {
        accessToken: `${unsigned}.${encodedSignature}`,
        exp,
    };
}

export function verifyAccessToken(token: string): JwtPayload | null {
    const parts = token.split(".");

    if (parts.length !== 3) {
        return null;
    }

    const [header, payload, signature] = parts;

    if (!header || !payload || !signature) {
        return null;
    }

    const unsigned = `${header}.${payload}`;

    const expected = base64UrlEncode(
        createHmac("sha256", getJwtSecret()).update(unsigned).digest()
    );

    if (expected !== signature) {
        return null;
    }

    try {
        const payloadJson = base64UrlDecode(payload).toString("utf8");
        const decoded = JSON.parse(payloadJson) as JwtPayload;

        if (typeof decoded.exp !== "number" || decoded.exp * 1000 <= Date.now()) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

export function getTokenExpirationDate(expSeconds: number) {
    return new Date(expSeconds * 1000);
}

export async function ensureAuthTables() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS epilog_user (
            user_index BIGINT AUTO_INCREMENT PRIMARY KEY,
            id VARCHAR(120) NOT NULL UNIQUE,
            pw TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS epilog_access_users (
            access_user_index BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_index BIGINT NOT NULL,
            access_token VARCHAR(512) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_epilog_access_users_user_index (user_index),
            UNIQUE KEY uk_epilog_access_users_access_token (access_token),
            CONSTRAINT fk_epilog_access_users_user
                FOREIGN KEY (user_index)
                REFERENCES epilog_user(user_index)
                ON DELETE CASCADE
        )
    `);
}

export async function findUserById(id: string) {
    const rows = await db.query(
        `
        SELECT user_index, id, pw, created_at, updated_at
        FROM epilog_user
        WHERE id = ?
        LIMIT 1
        `,
        [id]
    );

    return ((rows as AuthUserRow[])[0] ?? null);
}

export async function createUser(id: string, plainPassword: string) {
    const hashed = hashPassword(plainPassword);

    await db.execute(
        `
        INSERT INTO epilog_user (id, pw)
        VALUES (?, ?)
        `,
        [id, hashed]
    );

    return findUserById(id);
}

export async function saveAccessToken(params: { userIndex: number; accessToken: string; expiresAt: Date; }) {
    await db.query(
        `
        INSERT INTO epilog_access_users (user_index, access_token, expires_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            access_token = VALUES(access_token),
            expires_at = VALUES(expires_at),
            updated_at = CURRENT_TIMESTAMP
        `,
        [params.userIndex, params.accessToken, params.expiresAt]
    );
}
