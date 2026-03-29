import SearchWorks from "@/components/SearchWorks";

type SearchPageProps = {
    searchParams: Promise<{
        q?: string | string[];
    }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const resolvedSearchParams = await searchParams;
    const keywordRaw = resolvedSearchParams?.q;
    const keyword = (Array.isArray(keywordRaw) ? keywordRaw[0] : keywordRaw ?? "").trim();

    return <SearchWorks key={keyword} keyword={keyword} />;
}
