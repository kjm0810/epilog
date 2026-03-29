'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useUserAuthStore } from "@/store/userAuth";

type BookmarkStatusResponse = {
    data?: {
        work_index: number;
        is_bookmarked: boolean;
        bookmark_count: number;
    };
};

export default function BookmarkBtn({ workIndex, initialCount = 0 }: { workIndex: number; initialCount?: number; }) {
    const router = useRouter();
    const user = useUserAuthStore((state) => state.user);
    const isInitialized = useUserAuthStore((state) => state.isInitialized);
    const isLoading = useUserAuthStore((state) => state.isLoading);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkCount, setBookmarkCount] = useState(initialCount);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        let canceled = false;

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/bookmark?work_index=${workIndex}`, {
                    method: "GET",
                    credentials: "include",
                });

                if (!res.ok) {
                    return;
                }

                const data = await res.json() as BookmarkStatusResponse;

                if (canceled) {
                    return;
                }

                setIsBookmarked(Boolean(data.data?.is_bookmarked));
                setBookmarkCount(Number(data.data?.bookmark_count ?? initialCount));
            } catch {
                if (canceled) {
                    return;
                }

                setIsBookmarked(false);
                setBookmarkCount(initialCount);
            }
        };

        void fetchStatus();

        return () => {
            canceled = true;
        };
    }, [initialCount, workIndex, user?.id]);

    const onToggleBookmark = async () => {
        if (isSending || !isInitialized || isLoading) {
            return;
        }

        if (!user) {
            router.push("/login");
            return;
        }

        setIsSending(true);

        try {
            const method = isBookmarked ? "DELETE" : "POST";
            const res = await fetch("/api/bookmark", {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ work_index: workIndex }),
            });

            if (res.status === 401) {
                router.push("/login");
                return;
            }

            if (!res.ok) {
                return;
            }

            const data = await res.json() as BookmarkStatusResponse;
            setIsBookmarked(Boolean(data.data?.is_bookmarked));
            setBookmarkCount(Number(data.data?.bookmark_count ?? bookmarkCount));
            router.refresh();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <button
            type="button"
            className={`btn btn-orange bookmark-btn ${isBookmarked ? "active" : ""} ${(isSending || isLoading) ? "disabled" : ""}`}
            onClick={onToggleBookmark}
            disabled={isSending || isLoading}
        >
            <Icon type="bookmark" />
            <span>{isBookmarked ? "북마크됨" : "북마크"}</span>
            <span>{bookmarkCount}</span>
        </button>
    );
}
