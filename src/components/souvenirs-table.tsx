import { useState, useEffect, useRef } from "react";
import supabase from "../utils/supabase";
import { Search, Loader2 } from "lucide-react";
import type { Database } from "../utils/database.types";

type Souvenir = Database["public"]["Tables"]["souvenirs"]["Row"];

interface SouvenirsTableProps {
  initialData: Souvenir[];
}

export function SouvenirsTable({ initialData }: SouvenirsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<Souvenir[]>(initialData);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Handle search with debounce
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, reset to initial data
    if (searchQuery === "") {
      setData(initialData);
      setIsSearching(false);
      return;
    }

    // Set searching state
    setIsSearching(true);

    // Set a new timeout for the search
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const { data: searchResults, error } = await supabase
          .from("souvenirs")
          .select("*")
          .ilike("name", `%${searchQuery}%`);

        if (error) {
          throw error;
        }

        setData(searchResults || []);
      } catch (error) {
        console.error("Error searching souvenirs:", error);
        // Fallback to client-side filtering if the query fails
        const filtered = initialData.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setData(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms delay for debounce

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, initialData]);

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto px-4">
      <div className="relative">
        <div className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full px-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Mobile view - card layout */}
      <div className="md:hidden space-y-3">
        {isSearching && searchQuery && data.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {!isSearching &&
          data.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 space-y-2 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{item.name}</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.is_accepted
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {item.is_accepted ? "Accepted" : "Pending"}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Number of souvenirs: {item.number_of_souvenir}
              </div>
            </div>
          ))}

        {!isSearching && searchQuery && data.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            No souvenirs found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Desktop view - table layout */}
      <div className="hidden md:block rounded-md border bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Number of Souvenirs
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isSearching && searchQuery && data.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : (
              <>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.number_of_souvenir}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.is_accepted
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.is_accepted ? "Accepted" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}

                {!isSearching && searchQuery && data.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No souvenirs found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
