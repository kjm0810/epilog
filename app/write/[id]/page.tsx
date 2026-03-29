

export default async function Write({ params }: { params: { id: string } }) {
    const {id} = await params;

    return (
        <div className="write-wrap">
            <div className="container" style={{ padding: '40px 16px' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
                    감상글 작성
                </div>
                <div style={{ fontSize: '16px', lineHeight: '24px' }}>
                    {`${id}번 작품 감상글 작성은 상세 페이지의 "감상글 작성하기" 버튼에서 진행할 수 있습니다.`}
                </div>
            </div>
        </div>
    )
}
