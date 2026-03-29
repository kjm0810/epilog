import Weekend from "@/components/Weekend";
import WorkList from "@/components/WorkList";
import WriteBtn from "../components/WriteBtn";
import { headers } from "next/headers";

export default async function Home() {
    const headersList = await headers()

    const host = headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || 'http'

    const url = `${protocol}://${host}`


  let hot_work_list = {};

  const res = await fetch(`${url}/api/hot_work_list`);
  const data = await res.json();

  hot_work_list = data;


  return (
    <div className="main">

      <div className="intro">
        <div className="container">
          <div className="typo">
            이야기를 모아 취향을 기록하세요!
          </div>
          <div className="sub-text">
            여러 플랫폼의 웹툰을 한곳에서 찾고,<br/>
            작품에 대한 감상과 별점을 남겨 나만의 취향을 쌓아보세요.
          </div>

          <WriteBtn id={0} />
        </div>
      </div>
      <div className="container">
        <div className="hot-work">
          <div className="section-title">

            감상글이 많은 작품
          </div>
          <WorkList hot_work_list={hot_work_list}>
          </WorkList>
        </div>
      </div>
      <div className="container">
        <Weekend />
      </div>
    </div>
  );
}
