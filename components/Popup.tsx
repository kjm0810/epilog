'use client';

import { usePopupStore } from '@/store/popup';
import { useCallback, useEffect, useState } from 'react';
import { useUserAuthStore } from '@/store/userAuth';
import { usePathname, useRouter } from 'next/navigation';

type PopupReviewData = {
  work_index: number;
  work_name: string;
  user_index: number;
  has_reviewed: boolean;
  review_index: number | null;
  rating: number;
  rewatch_intent: boolean;
  is_public: boolean;
  exp: string;
};

type WorkListResponse = {
  data?: Work[];
};

export default function Popup() {
  const popup = usePopupStore((state) => state.popup);
  const clear = usePopupStore((state) => state.clear);
  const user = useUserAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();

  const [targetWork, setTargetWork] = useState<PopupReviewData | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchList, setSearchList] = useState<Work[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [retry, setRetry] = useState(false);
  const [isShow, setIsShow] = useState(false);
  const [exp, setExp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [workError, setWorkError] = useState('');

  const isSelectMode = popup?.work_index === 0;
  const isWorkLoading = popup !== null && popup.work_index > 0 && targetWork === null && workError === '';

  const resetReviewForm = useCallback(() => {
    setTargetWork(null);
    setStarCount(0);
    setRetry(false);
    setIsShow(false);
    setExp('');
  }, []);

  const fetchReviewData = useCallback(async (workIndex: number) => {
    if (!workIndex || workIndex < 1) {
      resetReviewForm();
      return;
    }

    setWorkError('');

    try {
      const res = await fetch(`/api/review_my?work_index=${workIndex}`);

      if (!res.ok) {
        resetReviewForm();
        setWorkError('작품 정보를 불러오지 못했습니다.');
        return;
      }

      const data = await res.json() as { data?: PopupReviewData };
      const fetched = data.data ?? null;

      if (!fetched) {
        resetReviewForm();
        setWorkError('작품 정보를 불러오지 못했습니다.');
        return;
      }

      setTargetWork(fetched);
      setStarCount(Number(fetched.rating ?? 0));
      setRetry(Boolean(fetched.rewatch_intent));
      setIsShow(Boolean(fetched.is_public ?? true));
      setExp(fetched.exp ?? '');
    } catch {
      resetReviewForm();
      setWorkError('작품 정보를 불러오지 못했습니다.');
    }
  }, [resetReviewForm]);

  useEffect(() => {
    if (popup?.type !== 'write') {
      return;
    }

    setSearchKeyword('');
    setSearchList([]);
    setIsSearchLoading(false);
    setIsSearchFocused(false);
    setWorkError('');

    if (popup.work_index === 0) {
      resetReviewForm();
      return;
    }

    void fetchReviewData(popup.work_index);
  }, [fetchReviewData, popup?.type, popup?.work_index, resetReviewForm]);

  useEffect(() => {
    if (popup?.type !== 'write' || popup.work_index !== 0 || targetWork) {
      return;
    }

    const keyword = searchKeyword.trim();

    if (!keyword) {
      setSearchList([]);
      setIsSearchLoading(false);
      return;
    }

    let canceled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearchLoading(true);
        const params = new URLSearchParams({
          weekend: 'all',
          page: '1',
          limit: '8',
          keyword,
        });
        const response = await fetch(`/api/work_list?${params.toString()}`);

        if (!response.ok) {
          if (!canceled) {
            setSearchList([]);
          }
          return;
        }

        const data = await response.json() as WorkListResponse;

        if (canceled) {
          return;
        }

        setSearchList(Array.isArray(data.data) ? data.data : []);
      } catch {
        if (!canceled) {
          setSearchList([]);
        }
      } finally {
        if (!canceled) {
          setIsSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [popup?.type, popup?.work_index, searchKeyword, targetWork]);

  const onClear = () => {
    resetReviewForm();
    setSearchKeyword('');
    setSearchList([]);
    setIsSearchLoading(false);
    setIsSearchFocused(false);
    setWorkError('');
    clear();
  };

  const onStarClick = (i: number) => {
    if (starCount === 1 && i + 1 === 1) {
      setStarCount(0);
      return;
    }

    setStarCount(i + 1);
  };

  const onSend = async () => {
    if (!targetWork || isSending || targetWork.has_reviewed) {
      return;
    }

    const reviewExp = exp.trim();

    if (!reviewExp || starCount < 1) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          work_index: targetWork.work_index,
          user_index: targetWork.user_index,
          nickname: user?.nickname,
          rating: starCount,
          rewatch_intent: retry,
          exp: reviewExp,
          content: reviewExp,
          is_public: isShow,
          is_show: isShow,
        }),
      });

      if (!response.ok) {
        return;
      }

      onClear();

      if (pathname?.startsWith('/work/detail/')) {
        router.refresh();
      }
    } finally {
      setIsSending(false);
    }
  };

  const onSearchBlur = () => {
    window.setTimeout(() => {
      setIsSearchFocused(false);
    }, 120);
  };

  const onSelectWork = (work: Work) => {
    setSearchKeyword(work.name);
    setSearchList([]);
    setIsSearchFocused(false);
    void fetchReviewData(work.work_index);
  };

  const resetSelectedWork = () => {
    resetReviewForm();
    setWorkError('');
    setSearchKeyword('');
    setSearchList([]);
    setIsSearchFocused(true);
  };

  const isShowDropdown = isSelectMode && targetWork === null && isSearchFocused && searchKeyword.trim().length > 0;

  if (!popup) {
    return null;
  }

  return (
    <div className="popup">
      <div className="dim" onClick={onClear}></div>
      <div className="inner">
        {popup.type === 'write' &&
          <div className="write-wrap">
            <div className="item">
              <div className="key">
                작품 이름
              </div>
              {targetWork ? (
                <div className="value input-box">
                  <input type="text" value={targetWork.work_name || ''} readOnly />
                  {isSelectMode ? (
                    <button type="button" className="close search-reset" onClick={resetSelectedWork}>
                      다시 선택
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="value input-box work-search-box">
                  {isSelectMode ? (
                    <>
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => { setSearchKeyword(e.target.value); }}
                        onFocus={() => { setIsSearchFocused(true); }}
                        onBlur={onSearchBlur}
                        placeholder="작품명, 작가, 장르를 검색하세요."
                      />
                      {isShowDropdown ? (
                        <div className="search-dropdown">
                          {isSearchLoading ? (
                            <div className="search-status">검색 중...</div>
                          ) : searchList.length > 0 ? (
                            searchList.map((work) => (
                              <button
                                key={`popup-work-${work.work_index}`}
                                type="button"
                                className="search-option"
                                onMouseDown={(e) => { e.preventDefault(); }}
                                onClick={() => { onSelectWork(work); }}
                              >
                                <span className="name">{work.name}</span>
                                <span className="meta">{work.writer}</span>
                              </button>
                            ))
                          ) : (
                            <div className="search-status">검색 결과가 없습니다.</div>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <input type="text" value={isWorkLoading ? '작품 정보를 불러오는 중...' : ''} readOnly />
                  )}
                </div>
              )}
            </div>
            {
              targetWork?.has_reviewed &&
              <div className="item already">
                <div className="key">
                  이미 리뷰가 작성된 작품입니다.
                </div>
              </div>
            }

            {workError ? (
              <div className="item">
                <div className="value text-area-box error-box">
                  {workError}
                </div>
              </div>
            ) : null}

            <div className="item">
              <div className="key">
                별점
              </div>
              <div className="value">
                <div className="star-wrap">
                  {[...Array(5)].map((_, i) => (
                    <div key={`star-${i}`} className="star-count" onClick={() => { onStarClick(i); }}>
                      {starCount >= (i + 1)
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 20 20" fill="none">
                            <path d="M10 14.3958L6.5417 16.4792C6.38892 16.5764 6.2292 16.6181 6.06253 16.6042C5.89586 16.5903 5.75003 16.5347 5.62503 16.4375C5.50003 16.3403 5.40281 16.2189 5.33336 16.0733C5.26392 15.9278 5.25003 15.7644 5.2917 15.5833L6.20836 11.6458L3.14586 9C3.00697 8.875 2.92031 8.7325 2.88586 8.5725C2.85142 8.4125 2.8617 8.25639 2.9167 8.10416C2.9717 7.95194 3.05503 7.82694 3.1667 7.72916C3.27836 7.63139 3.43114 7.56889 3.62503 7.54166L7.6667 7.1875L9.2292 3.47916C9.29864 3.3125 9.40642 3.1875 9.55253 3.10416C9.69864 3.02083 9.84781 2.97916 10 2.97916C10.1523 2.97916 10.3014 3.02083 10.4475 3.10416C10.5936 3.1875 10.7014 3.3125 10.7709 3.47916L12.3334 7.1875L16.375 7.54166C16.5695 7.56944 16.7223 7.63194 16.8334 7.72916C16.9445 7.82639 17.0278 7.95139 17.0834 8.10416C17.1389 8.25694 17.1495 8.41333 17.115 8.57333C17.0806 8.73333 16.9936 8.87555 16.8542 9L13.7917 11.6458L14.7084 15.5833C14.75 15.7639 14.7361 15.9272 14.6667 16.0733C14.5973 16.2194 14.5 16.3408 14.375 16.4375C14.25 16.5342 14.1042 16.5897 13.9375 16.6042C13.7709 16.6186 13.6111 16.5769 13.4584 16.4792L10 14.3958Z" fill="#7C4DFF" />
                          </svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 15 15" fill="none">
                            <path d="M5.3818 10.2813L7.35055 9.09375L9.3193 10.2969L8.80367 8.04688L10.538 6.54688L8.2568 6.34375L7.35055 4.21875L6.4443 6.32813L4.16305 6.53125L5.89742 8.04688L5.3818 10.2813ZM7.35055 10.5625L4.7568 12.125C4.64221 12.1979 4.52242 12.2292 4.39742 12.2188C4.27242 12.2083 4.16305 12.1667 4.0693 12.0938C3.97555 12.0208 3.90263 11.9298 3.85055 11.8206C3.79846 11.7115 3.78805 11.589 3.8193 11.4531L4.5068 8.5L2.20992 6.51563C2.10576 6.42188 2.04076 6.315 2.01492 6.195C1.98909 6.075 1.9968 5.95792 2.03805 5.84375C2.0793 5.72958 2.1418 5.63583 2.22555 5.5625C2.3093 5.48917 2.42388 5.44229 2.5693 5.42188L5.60055 5.15625L6.77242 2.375C6.82451 2.25 6.90534 2.15625 7.01492 2.09375C7.12451 2.03125 7.23638 2 7.35055 2C7.46471 2 7.57659 2.03125 7.68617 2.09375C7.79576 2.15625 7.87659 2.25 7.92867 2.375L9.10055 5.15625L12.1318 5.42188C12.2776 5.44271 12.3922 5.48958 12.4755 5.5625C12.5589 5.63542 12.6214 5.72917 12.663 5.84375C12.7047 5.95833 12.7126 6.07563 12.6868 6.19563C12.661 6.31563 12.5958 6.42229 12.4912 6.51563L10.1943 8.5L10.8818 11.4531C10.913 11.5885 10.9026 11.711 10.8505 11.8206C10.7985 11.9302 10.7255 12.0213 10.6318 12.0938C10.538 12.1663 10.4287 12.2079 10.3037 12.2188C10.1787 12.2296 10.0589 12.1983 9.9443 12.125L7.35055 10.5625Z" fill="#7C4DFF" />
                          </svg>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="item">
              <div className="key">
                정주행 의사
              </div>
              <div className="value">
                <input type="checkbox" checked={retry} onChange={(e) => { setRetry(e.target.checked); }} />
              </div>
            </div>

            <div className="item">
              <div className="key">
                감상글 공개 여부
              </div>
              <div className="value">
                <input type="checkbox" checked={isShow} onChange={(e) => { setIsShow(e.target.checked); }} />
              </div>
            </div>

            <div className="item">
              <div className="key">
                감상글
              </div>
              <div className="value text-area-box">
                <textarea maxLength={500} value={exp} onChange={(e) => { setExp(e.target.value); }} className={`${targetWork?.has_reviewed && 'disabled'}`} />
                <div className="length">{exp.length} / 500</div>
              </div>
            </div>

            <div className="btn-wrap">
              <div className={`btn btn-purple ${(targetWork === null || exp.trim() === '' || starCount < 1 || isSending || targetWork?.has_reviewed) ? 'disabled' : ''}`} onClick={onSend}>
                {isSending ? '등록 중...' : '등록하기'}
              </div>
            </div>
          </div>}
      </div>
    </div>
  );
}
