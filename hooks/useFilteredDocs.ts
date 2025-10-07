import { useMemo } from "react";
import { Doc } from "@/types/types";

export function useFilteredDocs(
    documents: Doc[],
    selectedStatus: string | null,
    searchQuery: string
) {
    return useMemo(() => {
        return documents.filter((doc) => {
            const matchesStatus =
                selectedStatus === "all" ||
                !selectedStatus ||
                doc.status === selectedStatus;
            const matchesSearch = doc.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [documents, selectedStatus, searchQuery]);
}
