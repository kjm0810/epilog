'use client'

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

type TabItem = {
    name: string;
    id: string;
};

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

export default function Weekend() {
    const [activeTab, setActiveTab] = useState<string>('wed');
    const [workList, setWorkList] = useState<Work[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const activeTabRef = useRef(activeTab);
    const hasMoreRef = useRef(hasMore);
    const isFetchingRef = useRef(false);

    const tabItems: TabItem[] = [
        {
            name: '전체',
            id: 'all',
        },
        {
            name: '월',
            id: 'mon',
        },
        {
            name: '화',
            id: 'tue',
        },
        {
            name: '수',
            id: 'wed',
        },
        {
            name: '목',
            id: 'thu',
        },
        {
            name: '금',
            id: 'fri',
        },
        {
            name: '토',
            id: 'sat',
        },
        {
            name: '일',
            id: 'sun',
        },
    ]

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    const fetchPage = useCallback(async (nextPage: number, mode: 'reset' | 'append') => {
        const tabAtRequest = activeTab;

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
            const res = await fetch(`/api/work_list?weekend=${tabAtRequest}&page=${nextPage}&limit=${PAGE_SIZE}`);

            if (!res.ok) {
                throw new Error('작품 목록을 불러오지 못했습니다.');
            }

            const data = await res.json() as WorkListResponse;
            const nextList = Array.isArray(data?.data) ? data.data : [];
            const nextHasMore = typeof data.pagination?.hasMore === 'boolean'
                ? data.pagination.hasMore
                : nextList.length === PAGE_SIZE;

            if (activeTabRef.current !== tabAtRequest) {
                return;
            }

            setWorkList((prev) => mode === 'reset' ? nextList : [...prev, ...nextList]);
            setPage(nextPage);
            setHasMore(nextHasMore);
            hasMoreRef.current = nextHasMore;
        } catch (error) {
            if (activeTabRef.current !== tabAtRequest) {
                return;
            }

            setErrorMessage(error instanceof Error ? error.message : '작품 목록 조회 중 오류가 발생했습니다.');

            if (mode === 'reset') {
                setWorkList([]);
                setPage(1);
                setHasMore(false);
                hasMoreRef.current = false;
            }
        } finally {
            isFetchingRef.current = false;

            if (activeTabRef.current === tabAtRequest) {
                setIsInitialLoading(false);
                setIsLoadingMore(false);
            }
        }
    }, [activeTab]);

    useEffect(() => {
        setWorkList([]);
        setPage(1);
        setHasMore(true);
        hasMoreRef.current = true;
        setErrorMessage(null);
        void fetchPage(1, 'reset');
    }, [activeTab, fetchPage]);

    const loadNextPage = useCallback(async () => {
        if (isInitialLoading || isLoadingMore || !hasMore) {
            return;
        }

        await fetchPage(page + 1, 'append');
    }, [fetchPage, hasMore, isInitialLoading, isLoadingMore, page]);

    useEffect(() => {
        const target = loadMoreRef.current;

        if (!target || !hasMore) {
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
    }, [hasMore, loadNextPage]);

    const activeTabName = tabItems.find((item) => item.id === activeTab)?.name ?? '';

    return (
        <div className="weekend-section">
            <div className="tab-wrap">
                {
                    tabItems.map((tab) => {
                        return (
                            <div className={`tab-item ${String(activeTab) === String(tab.id) && 'active'}`} key={`tab-weekend-${tab.id}`} onClick={() => {setActiveTab(tab.id)}}>
                                {tab.name}
                            </div>
                        )
                    })
                }
            </div>
            <div className="contents-wrap">
                <div className="top">
                    <div className="left">
                        <div className="title">
                            {activeTabName}
                            {activeTab === 'all' ? '' : '요'} 웹툰
                        </div>
                        <div className="exp">
                            작품 목록은 스크롤할 때마다 자동으로 이어서 불러옵니다.
                        </div>
                    </div>
                    <div className="right">

                    </div>
                </div>
                <div className="contents">
                    {
                        workList.map((work) => {
                            const platformClass = work.platform_id === 1 ? 'naver' : work.platform_id === 2 ? 'kakao' : '';
                            const platformText = work.platform_id === 1 ? 'NAVER' : work.platform_id === 2 ? 'KAKAO' : '';
                            const thumbnail = work.img_url ?? '/images/logo.webp';
                            const writerText = work.writer.split(',').map((name) => name.trim()).join(' / ');
                            return (
                                <Link href={`/work/detail/${work.work_index}`} key={`weekend-work-${work.work_index}`} className="weekend-item">
                                    {platformText && (
                                        <div className={`badge ${platformClass}`.trim()}>
                                            {platformText}
                                        </div>
                                    )}
                                    <img src={thumbnail} alt={`${work.name} 썸네일`} />
                                    <div className="info">
                                        <div className="name">
                                            {work.name}
                                        </div>
                                        <div className="writer">
                                            {writerText}
                                        </div>
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
                            )
                        })
                    }
                </div>
                {isInitialLoading && (
                    <div className="infinite-status">작품 목록을 불러오는 중입니다...</div>
                )}
                {!isInitialLoading && workList.length === 0 && !errorMessage && (
                    <div className="infinite-status">해당 요일 작품이 없습니다.</div>
                )}
                {errorMessage && (
                    <div className="infinite-status error">{errorMessage}</div>
                )}
                {workList.length > 0 && (
                    <>
                        {isLoadingMore && (
                            <div className="infinite-status">더 불러오는 중...</div>
                        )}
                        {!hasMore && !isLoadingMore && (
                            <div className="infinite-status end">마지막 작품까지 모두 확인했어요.</div>
                        )}
                        <div className="infinite-trigger" ref={loadMoreRef} aria-hidden="true" />
                    </>
                )}
            </div>
        </div>
    )
}
