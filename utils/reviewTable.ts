import db from "@/utils/db";
import { ensureWorkTable } from "@/utils/workTable";

export async function ensureReviewTable() {
    await ensureWorkTable();

    await db.query(`
        CREATE TABLE IF NOT EXISTS epilog_reviews (
            review_index BIGINT AUTO_INCREMENT PRIMARY KEY,
            work_index INT NOT NULL,
            user_index INT NOT NULL,
            nickname VARCHAR(60) NOT NULL,
            rating TINYINT NOT NULL,
            rewatch_intent TINYINT(1) NOT NULL DEFAULT 0,
            is_public TINYINT(1) NOT NULL DEFAULT 1,
            exp TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_epilog_reviews_work
                FOREIGN KEY (work_index)
                REFERENCES epilog_works(work_index)
                ON DELETE CASCADE,
            CONSTRAINT chk_epilog_reviews_rating
                CHECK (rating BETWEEN 1 AND 5),
            INDEX idx_epilog_reviews_work_created (work_index, created_at)
        )
    `);
}
