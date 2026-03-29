import db from "@/utils/db";
import { ensureWorkTable } from "@/utils/workTable";

export async function ensureBookmarkTable() {
    await ensureWorkTable();

    await db.query(`
        CREATE TABLE IF NOT EXISTS epilog_bookmarks (
            bookmark_index BIGINT AUTO_INCREMENT PRIMARY KEY,
            work_index INT NOT NULL,
            user_index INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_epilog_bookmarks_work_user (work_index, user_index),
            CONSTRAINT fk_epilog_bookmarks_work
                FOREIGN KEY (work_index)
                REFERENCES epilog_works(work_index)
                ON DELETE CASCADE,
            INDEX idx_epilog_bookmarks_work_index (work_index)
        )
    `);
}
