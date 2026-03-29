'use client'

import Icon from "@/components/Icon";
import { useUserAuthStore } from "@/store/userAuth";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type WorkListPagination = {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
};

type BookmarkWorkListResponse = {
    data?: Work[];
    pagination?: WorkListPagination;
};

const PAGE_SIZE = 24;

export default function BookmarkWorks() {
    const user = useUserAuthStore((state) => state.user);
    const isInitialized = useUserAuthStore((state) => state.isInitialized);
    const isLoading = useUserAuthStore((state) => state.isLoading);

    const [workList, setWorkList] = useState<Work[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const userId = user?.id ?? null;
    const userIdRef = useRef<string | number | null>(userId);
    const hasMoreRef = useRef(hasMore);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    const fetchPage = useCallback(async (nextPage: number, mode: 'reset' | 'append') => {
        const userIdAtRequest = userId;

        if (!userIdAtRequest) {
            return;
        }

        if (isFetchingRef.current) {
            return;
        }

        if (mode === 'append' && !hasMoreRef.current) {
            return;
        }

        isFetchingRef.current = true;

        if (mode === 'reset') {
            setIsInitialLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        setErrorMessage(null);

        try {
            const params = new URLSearchParams({
                page: String(nextPage),
                limit: String(PAGE_SIZE),
            });

            const res = await fetch(`/api/bookmark_list?${params.toString()}`, {
                credentials: 'include',
            });

            if (res.status === 401) {
                throw new Error('로그인이 필요합니다.');
            }

            if (!res.ok) {
                throw new Error('북마크 작품 목록을 불러오지 못했습니다.');
            }

            const data = await res.json() as BookmarkWorkListResponse;
            const nextList = Array.isArray(data?.data) ? data.data : [];
            const nextHasMore = typeof data.pagination?.hasMore === 'boolean'
                ? data.pagination.hasMore
                : nextList.length === PAGE_SIZE;

            if (userIdRef.current !== userIdAtRequest) {
                return;
            }

            setWorkList((prev) => mode === 'reset' ? nextList : [...prev, ...nextList]);
            setPage(nextPage);
            setHasMore(nextHasMore);
            hasMoreRef.current = nextHasMore;
        } catch (error) {
            if (userIdRef.current !== userIdAtRequest) {
                return;
            }

            setErrorMessage(error instanceof Error ? error.message : '북마크 작품 목록 조회 중 오류가 발생했습니다.');

            if (mode === 'reset') {
                setWorkList([]);
                setPage(1);
                setHasMore(false);
                hasMoreRef.current = false;
            }
        } finally {
            isFetchingRef.current = false;

            if (userIdRef.current === userIdAtRequest) {
                setIsInitialLoading(false);
                setIsLoadingMore(false);
            }
        }
    }, [userId]);

    useEffect(() => {
        setWorkList([]);
        setPage(1);
        setHasMore(false);
        hasMoreRef.current = false;
        setErrorMessage(null);

        if (!isInitialized || isLoading || !userId) {
            setIsInitialLoading(false);
            setIsLoadingMore(false);
            return;
        }

        setHasMore(true);
        hasMoreRef.current = true;
        void fetchPage(1, 'reset');
    }, [fetchPage, isInitialized, isLoading, userId]);

    const loadNextPage = useCallback(async () => {
        if (isInitialLoading || isLoadingMore || !hasMore) {
            return;
        }

        await fetchPage(page + 1, 'append');
    }, [fetchPage, hasMore, isInitialLoading, isLoadingMore, page]);

    useEffect(() => {
        const target = loadMoreRef.current;

        if (!target || !hasMore || !userId) {
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
                rootMargin: '220px 0px',
                threshold: 0,
            }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, loadNextPage, userId]);

    return (
        <div className="bookmark-page">
            <div className="container">
                <div className="bookmark-top">
                    <div className="title">북마크한 작품</div>
                    <div className="exp">마음에 저장한 작품을 한 번에 모아볼 수 있어요.</div>
                </div>

                {!isInitialized || isLoading ? (
                    <div className="bookmark-status">사용자 정보를 확인하는 중입니다...</div>
                ) : null}

                {isInitialized && !isLoading && !userId ? (
                    <div className="bookmark-empty-auth">
                        <div className="bookmark-status">로그인 후 북마크한 작품 목록을 확인할 수 있어요.</div>
                        <Link href="/login" className="btn btn-border">로그인하러 가기</Link>
                    </div>
                ) : null}

                {isInitialized && !isLoading && userId ? (
                    <>
                        <div className="bookmark-contents">
                            {workList.map((work) => {
                                const platformClass = work.platform_id === 1 ? 'naver' : work.platform_id === 2 ? 'kakao' : '';
                                const platformText = work.platform_id === 1 ? 'NAVER' : work.platform_id === 2 ? 'KAKAO' : '';
                                const thumbnail = work.img_url ?? '/images/logo.webp';
                                const writerText = work.writer
                                    .split(',')
                                    .map((name) => name.trim())
                                    .filter(Boolean)
                                    .join(' / ');

                                return (
                                    <Link href={`/work/detail/${work.work_index}`} key={`bookmark-work-${work.work_index}`} className="bookmark-item">
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
                            <div className="bookmark-status">북마크 작품을 불러오는 중입니다...</div>
                        )}
                        {!isInitialLoading && workList.length === 0 && !errorMessage && (
                            <div className="bookmark-status">아직 북마크한 작품이 없습니다.</div>
                        )}
                        {errorMessage && (
                            <div className="bookmark-status error">{errorMessage}</div>
                        )}
                        {workList.length > 0 && (
                            <>
                                {isLoadingMore && (
                                    <div className="bookmark-status">더 불러오는 중...</div>
                                )}
                                {!hasMore && !isLoadingMore && (
                                    <div className="bookmark-status end">마지막 북마크 작품까지 확인했어요.</div>
                                )}
                                <div className="bookmark-trigger" ref={loadMoreRef} aria-hidden="true" />
                            </>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}
