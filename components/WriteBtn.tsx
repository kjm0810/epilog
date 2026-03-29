'use client';

import { usePopupStore } from "@/store/popup"
import { useUserAuthStore } from "../store/userAuth";
import { useRouter } from "next/navigation";

export default function WriteBtn({id}: {id: number}) {
    const router = useRouter();

    const set = usePopupStore((state) => state.set);
    const user = useUserAuthStore();

    const onWrite = () => {
        if (user?.user === null) {
            router.push('/login')
        }
        else {
            set({type: 'write',work_index: id})
        }
    }
    return (
        <div className="btn btn-purple" onClick={onWrite}>감상글 작성하기</div>

    )
}
