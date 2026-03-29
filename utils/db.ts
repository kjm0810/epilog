import mysql, { type PoolOptions, type ResultSetHeader } from "mysql2/promise";

const poolConfig: PoolOptions = {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME ?? "",
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

const pool = mysql.createPool(poolConfig);

const db = {
    query: async <T = Record<string, unknown>>(
        text: string,
        params: unknown[] = []
    ): Promise<T[]> => {
        const [rows] = await pool.query(text, params);
        return rows as T[];
    },
    execute: async (
        text: string,
        params: unknown[] = []
    ): Promise<ResultSetHeader> => {
        const [result] = await pool.execute<ResultSetHeader>(text, params as []);
        return result;
    },
};

export default db;
