import SearchWorks from "@/components/SearchWorks";

type SearchPageProps = {
    searchParams: {
        q?: string | string[];
    };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const keywordRaw = await searchParams;
    const keyword =
        (Array.isArray(keywordRaw?.q)
            ? keywordRaw?.q?.[0]
            : keywordRaw?.q) ?? "";


    return <SearchWorks key={keyword} keyword={keyword} />;
}
