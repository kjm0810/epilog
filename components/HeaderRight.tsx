'use client'

import { useUserAuthStore } from '@/store/userAuth';
import Link from 'next/link';
import { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function HeaderRight() {
    const logout = useUserAuthStore((state) => state.logout);
    const user = useUserAuthStore((state) => state.user);
    const isInitialized = useUserAuthStore((state) => state.isInitialized);
    const isLoading = useUserAuthStore((state) => state.isLoading);
    const router = useRouter();

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const trimmed = String(formData.get("keyword") ?? "").trim();

        if (!trimmed) {
            router.push("/search");
            return;
        }

        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    };

    const onLogout = () => {
        logout();
    }

    return (
        <div className="right">
            <form className="search-box" onSubmit={submitSearch}>
                <input
                    type="text"
                    name="keyword"
                    placeholder="작품명, 작가, 장르 검색"
                    aria-label="웹툰 검색"
                />
                <button type="submit" className="search-submit" aria-label="검색">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" className="icon">
                        <path d="M6.73128 11.4375C5.80047 11.4375 4.89056 11.1615 4.11662 10.6444C3.34269 10.1272 2.73947 9.39221 2.38327 8.53225C2.02706 7.6723 1.93386 6.72603 2.11546 5.81311C2.29705 4.90018 2.74527 4.06161 3.40346 3.40343C4.06164 2.74525 4.90021 2.29702 5.81313 2.11543C6.72606 1.93384 7.67233 2.02704 8.53228 2.38324C9.39224 2.73945 10.1273 3.34266 10.6444 4.1166C11.1615 4.89054 11.4375 5.80044 11.4375 6.73125C11.4375 7.34928 11.3158 7.96127 11.0793 8.53225C10.8428 9.10324 10.4961 9.62206 10.0591 10.0591C9.62208 10.4961 9.10327 10.8427 8.53228 11.0793C7.96129 11.3158 7.34931 11.4375 6.73128 11.4375ZM6.73128 2.96875C5.9896 2.96875 5.26457 3.18868 4.64789 3.60074C4.0312 4.01279 3.55056 4.59846 3.26673 5.28369C2.9829 5.96891 2.90864 6.72291 3.05333 7.45034C3.19803 8.17777 3.55518 8.84595 4.07963 9.3704C4.60407 9.89485 5.27226 10.252 5.99969 10.3967C6.72712 10.5414 7.48112 10.4671 8.16634 10.1833C8.85156 9.89947 9.43723 9.41882 9.84929 8.80214C10.2613 8.18545 10.4813 7.46043 10.4813 6.71875C10.4813 5.72419 10.0862 4.77036 9.38293 4.0671C8.67967 3.36384 7.72584 2.96875 6.73128 2.96875Z" fill="#8B80F9" />
                        <path d="M12.5 12.9688C12.4384 12.969 12.3774 12.957 12.3205 12.9334C12.2636 12.9098 12.212 12.8751 12.1687 12.8313L9.58748 10.25C9.50468 10.1611 9.4596 10.0436 9.46174 9.92217C9.46389 9.80074 9.51308 9.68487 9.59896 9.59899C9.68485 9.5131 9.80071 9.46391 9.92215 9.46177C10.0436 9.45962 10.1611 9.5047 10.25 9.5875L12.8312 12.1687C12.919 12.2566 12.9683 12.3758 12.9683 12.5C12.9683 12.6242 12.919 12.7434 12.8312 12.8313C12.7879 12.8751 12.7364 12.9098 12.6795 12.9334C12.6226 12.957 12.5616 12.969 12.5 12.9688Z" fill="#8B80F9" />
                    </svg>
                </button>
            </form>
            <div className="user-info">
                {
                    !isInitialized || isLoading ? null :
                    user !== null ?
                        <>
                            <Link href={`/bookmark`} className="nick">
                                {user?.nickname ?? 'GUEST'}
                            </Link>
                            <div className="btn btn-border" onClick={onLogout}>
                                로그아웃
                            </div>
                        </>
                        :
                        <Link href={`/login`} className='btn btn-border'>
                            로그인
                        </Link>
                }

            </div>
        </div>
    )
}
