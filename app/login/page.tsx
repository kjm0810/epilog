'use client'

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserAuthStore } from "@/store/userAuth";

export default function Login() {
    const [id, setId] = useState('guest');
    const [pw, setPw] = useState('guest');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const loginWithCredentials = useUserAuthStore((state) => state.loginWithCredentials);

    const onLogin = async () => {
        if (isLoading) {
            return;
        }

        const inputId = id.trim();
        const inputPw = pw.trim();

        if (!inputId || !inputPw) {
            setError('id, pw를 입력해주세요.');
            return;
        }

        setError('');
        setIsLoading(true);

        const user = await loginWithCredentials({ id: inputId, pw: inputPw });

        setIsLoading(false);

        if (!user) {
            setError('로그인에 실패했습니다. id/pw를 확인해주세요.');
            return;
        }

        router.push('/');
    }

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onLogin();
    };

    const isSubmitDisabled = isLoading || !id.trim() || !pw.trim();

    return (
        <div className="login-page">
            <div className="container">
                <div className="login-wrap">
                    <div className="login-hero">
                        <div className="eyebrow">EPILOG</div>
                        <h2 className="hero-title">당신의 웹툰 취향을 다시 이어보세요</h2>
                        <p className="hero-desc">
                            에피로그에서 작품을 탐색하고 감상을 기록하면,<br />
                            나만의 취향 지도가 쌓입니다.
                        </p>
                    </div>

                    <form className="login-box" onSubmit={onSubmit}>
                        <div className="title">
                            로그인
                        </div>
                        <div className="exp">
                            아이디와 비밀번호를 입력해주세요.
                        </div>

                        <label className="input-item">
                            <span>ID</span>
                            <input
                                type="text"
                                value={id}
                                onChange={(e) => { setId(e.target.value) }}
                                placeholder="아이디"
                                autoComplete="username"
                            />
                        </label>

                        <label className="input-item">
                            <span>PW</span>
                            <input
                                type="password"
                                value={pw}
                                onChange={(e) => { setPw(e.target.value) }}
                                placeholder="비밀번호"
                                autoComplete="current-password"
                            />
                        </label>

                        {error ? <p className="error-msg">{error}</p> : null}

                        <button type="submit" className="btn btn-purple" disabled={isSubmitDisabled}>
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
