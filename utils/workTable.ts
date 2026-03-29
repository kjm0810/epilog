import db from "@/utils/db";

export async function ensureWorkTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS epilog_works (
            work_index INT PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            writer VARCHAR(255) NOT NULL,
            genre VARCHAR(255) NULL,
            introduce TEXT NULL,
            img_url TEXT NULL,
            platform_id INT NULL,
            update_weekend VARCHAR(50) NULL,
            status VARCHAR(50) NULL,
            link TEXT NULL,
            INDEX idx_epilog_works_platform_id (platform_id),
            INDEX idx_epilog_works_update_weekend (update_weekend)
        )
    `);
}
