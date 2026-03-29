import ReviewIcon from "@/components/ReviewIcon";
import WriteBtn from "@/components/WriteBtn";
import Link from "next/link";
import Icon from "@/components/Icon";
import BookmarkBtn from "@/components/BookmarkBtn";
import { headers } from "next/headers";

type WorkDetailResponse = {
  data: Work[];
};

type Review = {
  review_index: number;
  nickname: string;
  rating: number;
  rewatch_intent: boolean;
  exp: string;
};

type ReviewResponse = {
  data: Review[];
};

export default async function WorkDetail({ params }: { params: { id: string } }) {

  const headersList = await headers()

  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'http'

  const url = `${protocol}://${host}`

  const { id } = await params;
  const workIndex = Number(id);
  const baseUrl = url;

  console.log(`${url}/api/work_detail?work_index=${workIndex}`);

  const [workRes, reviewRes] = await Promise.all([
    fetch(`${baseUrl}/api/work_detail?work_index=${workIndex}`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/review?work_index=${workIndex}`, { cache: "no-store" }),
  ]);

  const workData = await workRes.json() as WorkDetailResponse;
  const reviewData = await reviewRes.json() as ReviewResponse;

  console.log(workData);

  const work = workData.data?.[0];
  const reviews = Array.isArray(reviewData.data) ? reviewData.data : [];

  if (!work) {
    return (
      <div className="detail-page">
        <div className="container">작품 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const platformClass =
    work.platform_id === 1 ? "naver" : work.platform_id === 2 ? "kakao" : "";
  const platformText =
    work.platform_id === 1 ? "NAVER" : work.platform_id === 2 ? "KAKAO" : "";
  const imageSrc = work.img_url ?? "/images/logo.webp";
  const workLink = work.link?.trim() ?? "";
  const writers = work.writer
    .split(",")
    .map((writer) => writer.trim())
    .filter(Boolean);
  const introText = work.introduce?.trim() || "아직 소개글이 등록되지 않았습니다.";
  const genres = (work.genre ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

  return (
    <div className="detail-page">
      <div className="container">
        <div className="detail-info">
          <div className="left">
            <img src={imageSrc} alt={`${work.name} 썸네일`} />
            {platformText && (
              <div className={`badge ${platformClass}`.trim()}>{platformText}</div>
            )}
          </div>

          <div className="right">
            <div className="top">
              <div className="title">
                {
                  work.name
                }
              </div>
              <div className="writer">
                {writers.map((writer, index) => (
                  <div className="writer-link" key={`detail-${id}-writer-${index}`}>
                    {index > 0 && <span>/</span>}
                    <Link href={`/`}>{writer}</Link>
                  </div>
                ))}
              </div>
              <div className="review">
                <div className="review-item">
                  <Icon type="star" />
                  {Number(work.rating_avg ?? 0).toFixed(1)}
                </div>
                <div className="review-item">
                  <Icon type="review" />
                  {work.review_count ?? 0}
                </div>
                <div className="review-item">
                  <Icon type="bookmark" />
                  {work.bookmark_count ?? 0}
                </div>
              </div>
              <div className="intro">
                {introText}
              </div>
              {genres.length > 0 && (
                <div className="genre-wrap">
                  {genres.map((genre) => (
                    <div className="genre" key={`genre-${genre}`}>
                      #{genre}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bottom">
              <div className="link-wrap">
                {workLink ? (
                  <Link className="btn btn-border" href={workLink} target="_blank" rel="noreferrer">
                    보러가기
                  </Link>
                ) : (
                  <span className="btn btn-border disabled">링크 없음</span>
                )}
                <WriteBtn id={Number(id)}></WriteBtn>
                <BookmarkBtn workIndex={work.work_index} initialCount={work.bookmark_count ?? 0} />
              </div>
            </div>
          </div>
        </div>


        <div className="other-review">
          <div className="title">
            다른 사람의 감상글
          </div>

          <div className="review-wrap">
            {reviews.length === 0 &&
              <div className="review-item">
                <div className="exp">
                  아직 등록된 감상글이 없습니다.
                </div>
              </div>}

            {reviews.map((review) => (
              <div className="review-item" key={`review-${review.review_index}`}>
                <div className="user">
                  {review.nickname}
                </div>
                <div className="evaluation-wrap">
                  <div className="evaluation-item">
                    <ReviewIcon type='star' text={String(review.rating)}></ReviewIcon>
                  </div>
                  <div className="evaluation-item">
                    <ReviewIcon type='retry' text={review.rewatch_intent ? '' : 'no'}></ReviewIcon>
                  </div>
                </div>
                <div className="exp">
                  {review.exp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
