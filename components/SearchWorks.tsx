'use client'

import Icon from "@/components/Icon";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type WorkListPagination = {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
};

type WorkListResponse = {
    data?: Work[];
    pagination?: WorkListPagination;
};

const PAGE_SIZE = 24;

export default function SearchWorks({ keyword }: { keyword: string }) {
    const [workList, setWorkList] = useState<Work[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const keywordRef = useRef(keyword);
    const hasMoreRef = useRef(hasMore);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        keywordRef.current = keyword;
    }, [keyword]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    const fetchPage = useCallback(async (nextPage: number, mode: "reset" | "append") => {
        const keywordAtRequest = keyword;

        if (!keywordAtRequest) {
            return;
        }

        if (isFetchingRef.current) {
            return;
        }

        if (mode === "append" && !hasMoreRef.current) {
            return;
        }

        isFetchingRef.current = true;

        if (mode === "reset") {
            setIsInitialLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        setErrorMessage(null);

        try {
            const params = new URLSearchParams({
                weekend: "all",
                page: String(nextPage),
                limit: String(PAGE_SIZE),
                keyword: keywordAtRequest,
            });

            const res = await fetch(`/api/work_list?${params.toString()}`);

            if (!res.ok) {
                throw new Error("검색 결과를 불러오지 못했습니다.");
            }

            const data = await res.json() as WorkListResponse;
            const nextList = Array.isArray(data?.data) ? data.data : [];
            const nextHasMore = typeof data.pagination?.hasMore === "boolean"
                ? data.pagination.hasMore
                : nextList.length === PAGE_SIZE;

            if (keywordRef.current !== keywordAtRequest) {
                return;
            }

            setWorkList((prev) => mode === "reset" ? nextList : [...prev, ...nextList]);
            setPage(nextPage);
            setHasMore(nextHasMore);
            hasMoreRef.current = nextHasMore;
        } catch (error) {
            if (keywordRef.current !== keywordAtRequest) {
                return;
            }

            setErrorMessage(error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.");

            if (mode === "reset") {
                setWorkList([]);
                setPage(1);
                setHasMore(false);
                hasMoreRef.current = false;
            }
        } finally {
            isFetchingRef.current = false;

            if (keywordRef.current === keywordAtRequest) {
                setIsInitialLoading(false);
                setIsLoadingMore(false);
            }
        }
    }, [keyword]);

    useEffect(() => {
        setWorkList([]);
        setPage(1);
        setHasMore(false);
        hasMoreRef.current = false;
        setErrorMessage(null);

        if (!keyword) {
            setIsInitialLoading(false);
            setIsLoadingMore(false);
            return;
        }

        setHasMore(true);
        hasMoreRef.current = true;
        void fetchPage(1, "reset");
    }, [keyword, fetchPage]);

    const loadNextPage = useCallback(async () => {
        if (isInitialLoading || isLoadingMore || !hasMore) {
            return;
        }

        await fetchPage(page + 1, "append");
    }, [fetchPage, hasMore, isInitialLoading, isLoadingMore, page]);

    useEffect(() => {
        const target = loadMoreRef.current;

        if (!target || !hasMore || !keyword) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;

                if (entry?.isIntersecting) {
                    void loadNextPage();
                }
            },
            {
                root: null,
                rootMargin: "220px 0px",
                threshold: 0,
            }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, keyword, loadNextPage]);

    return (
        <div className="search-page">
            <div className="container">
                <div className="search-top">
                    <div className="title">검색 결과</div>
                    <div className="exp">
                        {keyword ? `"${keyword}" 검색 결과입니다.` : "작품명, 작가, 장르를 검색해 보세요."}
                    </div>
                </div>

                {!keyword && (
                    <div className="search-status">검색어를 입력해 주세요.</div>
                )}

                {keyword && (
                    <>
                        <div className="search-contents">
                            {workList.map((work) => {
                                const platformClass = work.platform_id === 1 ? "naver" : work.platform_id === 2 ? "kakao" : "";
                                const platformText = work.platform_id === 1 ? "NAVER" : work.platform_id === 2 ? "KAKAO" : "";
                                const thumbnail = work.img_url ?? "/images/logo.webp";
                                const writerText = work.writer.split(",").map((name) => name.trim()).filter(Boolean).join(" / ");

                                return (
                                    <Link href={`/work/detail/${work.work_index}`} key={`search-work-${work.work_index}`} className="search-item">
                                        {platformText && (
                                            <div className={`badge ${platformClass}`.trim()}>
                                                {platformText}
                                            </div>
                                        )}
                                        <img src={thumbnail} alt={`${work.name} 썸네일`} />
                                        <div className="info">
                                            <div className="name">{work.name}</div>
                                            <div className="writer">{writerText}</div>
                                            <div className="review">
                                                <div className="review-item">
                                                    <Icon type="star" /> {Number(work.rating_avg ?? 0).toFixed(1)}
                                                </div>
                                                <div className="review-item">
                                                    <Icon type="review" /> {work.review_count ?? 0}
                                                </div>
                                                <div className="review-item">
                                                    <Icon type="bookmark" /> {work.bookmark_count ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {isInitialLoading && (
                            <div className="search-status">검색 결과를 불러오는 중입니다...</div>
                        )}
                        {!isInitialLoading && workList.length === 0 && !errorMessage && (
                            <div className="search-status">검색 결과가 없습니다.</div>
                        )}
                        {errorMessage && (
                            <div className="search-status error">{errorMessage}</div>
                        )}
                        {workList.length > 0 && (
                            <>
                                {isLoadingMore && (
                                    <div className="search-status">더 불러오는 중...</div>
                                )}
                                {!hasMore && !isLoadingMore && (
                                    <div className="search-status end">마지막 검색 결과까지 확인했어요.</div>
                                )}
                                <div className="search-trigger" ref={loadMoreRef} aria-hidden="true" />
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
