export default function PrivatePage() {
  return (
    <div className="private-page">
      <div className="container">
        <div className="private-box">
          <div className="title">비공개 포트폴리오</div>
          <div className="desc">
            이 페이지는 비공개로 설정되어 있습니다.<br />
            전달받은 접근 키(`key`)가 포함된 URL로 접속해 주세요.
          </div>
        </div>
      </div>
    </div>
  );
}
