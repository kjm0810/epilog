import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import Link from "next/link";
import HeaderRight from "@/components/HeaderRight";
import AuthBootstrap from "@/components/AuthBootstrap";
import Popup from "@/components/Popup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "에피로그",
  description: "이야기를 모아 취향을 기록하세요!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthBootstrap />
        <header>
          <div className="container">
            <div className="header-inner">
              <h1>
                <Link href={`/`}>
                  에피로그
                </Link>
              </h1>

              <HeaderRight></HeaderRight>
            </div>
          </div>
        </header>
        <div className="page">
          {children}
        </div>
        <footer>
          <div className="container">
            <div className="inner">
              <div className="left">
                개인 학습 및 포트폴리오용으로 제작된 비상업적 프로젝트로, 공식 서비스와 무관합니다. <br/>
                본 프로젝트에 포함된 콘텐츠(작품 정보, 이미지, 링크)는 각 플랫폼 및 저작권자에게 귀속됩니다. <br/>
                데이터는 변경, 누락, 중단될 수 있으며 정확성을 보장하지 않습니다.
              </div>

              <div className="right">

              </div>
            </div>
          </div>
        </footer>
        <Popup></Popup>
      </body>
    </html>
  );
}
