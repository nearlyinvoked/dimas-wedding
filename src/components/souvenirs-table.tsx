import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Check, X } from "lucide-react";
import supabase from "../utils/supabase";
import type { Database } from "../utils/database.types";

type Souvenir = Database["public"]["Tables"]["souvenirs"]["Row"];

interface SouvenirsTableProps {
  initialData: Souvenir[];
}

export function SouvenirsTable({ initialData }: SouvenirsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<Souvenir[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Record<number, boolean>>(
    {}
  );
  const searchTimeoutRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<
    Record<number, { status: boolean; timestamp: number }>
  >({});

  // Initialize data only once when initialData changes
  useEffect(() => {
    const sortedData = [...initialData].sort((a, b) => a.id - b.id);
    setData(sortedData);
  }, [initialData]);

  // Handle search with debounce
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, reset to sorted initial data
    if (searchQuery === "") {
      const sortedData = [...initialData].sort((a, b) => a.id - b.id);
      setData(sortedData);
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
          .ilike("name", `%${searchQuery}%`)
          .order("id", { ascending: true });

        if (error) {
          throw error;
        }

        setData(searchResults || []);
      } catch (error) {
        console.error("Error searching souvenirs:", error);
        // Fallback to client-side filtering if the query fails
        const filtered = [...initialData]
          .sort((a, b) => a.id - b.id)
          .filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        setData(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, initialData]);

  // Toggle acceptance status with improved optimistic updates
  const toggleAcceptance = useCallback(
    async (id: number, currentStatus: boolean) => {
      // Prevent duplicate clicks
      if (updatingItems[id]) return;

      // Set updating state for this specific item
      setUpdatingItems((prev) => ({ ...prev, [id]: true }));

      // Store the timestamp of this update
      const updateTimestamp = Date.now();
      pendingUpdatesRef.current[id] = {
        status: !currentStatus,
        timestamp: updateTimestamp,
      };

      // Immediately update the UI optimistically
      setData((prevData) =>
        prevData.map((item) =>
          item.id === id ? { ...item, is_accepted: !currentStatus } : item
        )
      );

      try {
        // Update the database in the background
        const { error } = await supabase
          .from("souvenirs")
          .update({ is_accepted: !currentStatus })
          .eq("id", id);

        if (error) throw error;

        // If this was the most recent update for this item, we're done
        // Otherwise, a newer update has already changed the UI
      } catch (error) {
        console.error("Error updating souvenir status:", error);

        // Only revert if this was the most recent update for this item
        if (pendingUpdatesRef.current[id]?.timestamp === updateTimestamp) {
          // Revert the optimistic update
          setData((prevData) =>
            prevData.map((item) =>
              item.id === id ? { ...item, is_accepted: currentStatus } : item
            )
          );

          // Show error message
          const toast = document.createElement("div");
          toast.className =
            "fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg";
          toast.textContent = "Failed to update status";
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.remove();
          }, 3000);
        }
      } finally {
        // Small delay before removing the updating state to make the transition feel smoother
        setTimeout(() => {
          // Only remove updating state if this was the most recent update
          if (pendingUpdatesRef.current[id]?.timestamp === updateTimestamp) {
            setUpdatingItems((prev) => {
              const newState = { ...prev };
              delete newState[id];
              return newState;
            });

            // Clean up the pending update
            delete pendingUpdatesRef.current[id];
          }
        }, 300); // Short delay for visual feedback
      }
    },
    [updatingItems]
  );

  // Status badge component for better reuse
  const StatusBadge = ({
    isAccepted,
    isUpdating,
    onClick,
  }: {
    isAccepted: boolean;
    isUpdating: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={isUpdating}
      className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 transition-all duration-200 ${
        isUpdating ? "opacity-80" : "opacity-100"
      } ${
        isAccepted
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
    >
      {isUpdating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isAccepted ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      {isAccepted ? "Accepted" : "Pending"}
    </button>
  );

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
              key={`mobile-${item.id}`}
              className="border rounded-lg p-4 space-y-2 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">
                  <span className="text-gray-500 mr-2">#{item.id}</span>
                  {item.name}
                </h3>
                <StatusBadge
                  isAccepted={item.is_accepted}
                  isUpdating={!!updatingItems[item.id]}
                  onClick={() => toggleAcceptance(item.id, item.is_accepted)}
                />
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
                ID
              </th>
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
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : (
              <>
                {data.map((item) => (
                  <tr key={`desktop-${item.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.number_of_souvenir}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="float-right">
                        <StatusBadge
                          isAccepted={item.is_accepted}
                          isUpdating={!!updatingItems[item.id]}
                          onClick={() =>
                            toggleAcceptance(item.id, item.is_accepted)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {!isSearching && searchQuery && data.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
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
