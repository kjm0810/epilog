'use client'

import Link from 'next/link';
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

type HotWorkListResponse = {
  data?: Work[];
};

export default function WorkList({ hot_work_list }: { hot_work_list: HotWorkListResponse }) {
  const list = Array.isArray(hot_work_list?.data) ? hot_work_list.data : [];

  const [index, setIndex] = useState(1); // 1부터 시작
  const [itemWidth, setItemWidth] = useState(0);
  const [isTransition, setIsTransition] = useState(true);

  const itemRef = useRef<HTMLAnchorElement | null>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const moveTo = useCallback((i: number) => {
    setIndex(i);
    setIsTransition(true);
  }, []);

  // width 측정
  useEffect(() => {
    const update = () => {
      if (itemRef.current) {
        const el = itemRef.current;
        const style = window.getComputedStyle(el);
        const margin =
          parseFloat(style.marginLeft) + parseFloat(style.marginRight);

        setItemWidth(el.offsetWidth + margin);
      }
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    if (!list.length) {
      return;
    }

    const interval = setInterval(() => {
      moveTo(index + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [index, list.length, moveTo]);

  // 👉 끝에서 순간 이동 (무한)
  useEffect(() => {
    if (index === 0) {
      setTimeout(() => {
        setIsTransition(false);
        setIndex(list.length);
      }, 400);
    }

    if (index === list.length + 1) {
      setTimeout(() => {
        setIsTransition(false);
        setIndex(1);
      }, 400);
    }
  }, [index, list.length]);

  // 👉 드래그
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    startX.current = e.clientX;
  };

  const onMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const diff = e.clientX - startX.current;

    if (diff > 50) moveTo(index - 1);
    else if (diff < -50) moveTo(index + 1);

    isDragging.current = false;
  };

  if (!list.length) return null;

  const extended: Work[] | null =
    list.length > 0
      ? [
          list[list.length - 1]!,
          ...list,
          list[0]!,
        ]
      : null;
  return (
    <div
      className="carousel"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div
        className="track"
        style={{
          transform: `translateX(calc(50% - ${(index + 0.5) * itemWidth}px))`,
          transition: isTransition ? '0.4s ease' : 'none',
        }}
      >
        {extended?.map((item: Work, i: number) => {
          const realIndex =
            i === 0 ? list.length - 1 :
            i === extended.length - 1 ? 0 :
            i - 1;

          const isActive = realIndex === (index - 1 + list.length) % list.length;
          const imageSrc = item.img_url ?? '/images/logo.webp';
          const writerNames = item.writer
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);

          return (
            <Link
              href={`/work/detail/${item.work_index}`}
              key={`${item.work_index}-${i}`}
              ref={i === 1 ? itemRef : null}
              className={`work-item ${isActive ? 'active' : ''}`}
            >
              <div className="left">
                <img src={imageSrc} alt={`${item.name} 썸네일`} />
              </div>

              <div className="right">
                <div className="work-title">{item.name}</div>
                <div className="writer-wrap">
                  {writerNames.map((w: string, wi: number) => (
                    <div key={wi} className="writer">
                      {wi > 0 && <span>/</span>}
                      {w}
                    </div>
                  ))}
                </div>
                <div className="review-meta">
                  <div className="review-count">
                    <Icon type="star" />
                    {Number(item.rating_avg ?? 0).toFixed(1)}
                  </div>
                  <div className="review-count">
                    <Icon type="review" />
                    {item.review_count ?? 0}
                  </div>
                  <div className="review-count">
                    <Icon type="bookmark" />
                    {item.bookmark_count ?? 0}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
