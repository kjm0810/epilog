import SearchWorks from "@/components/SearchWorks";

type SearchPageProps = {
    searchParams: {
        q?: string | string[];
    };
};

export default function SearchPage({ searchParams }: SearchPageProps) {
    const keywordRaw = searchParams?.q;
    const keyword =
        (Array.isArray(searchParams?.q)
            ? searchParams?.q?.[0]
            : searchParams?.q) ?? "";

    return <SearchWorks key={keyword} keyword={keyword} />;
}
