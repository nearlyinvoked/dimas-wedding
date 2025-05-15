import { useEffect, useState } from "react";
import "./App.css";
import supabase from "./utils/supabase";
import { SouvenirsTable } from "./components/souvenirs-table";
import type { Database } from "./utils/database.types";

type Souvenir = Database["public"]["Tables"]["souvenirs"]["Row"];

function App() {
  const [data, setData] = useState<Souvenir[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getData() {
      try {
        setLoading(true);
        const { data: souvenirs, error } = await supabase
          .from("souvenirs")
          .select("*");

        if (error) throw error;

        if (souvenirs) {
          setData(souvenirs);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch souvenirs data");
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 px-4">Souvenirs Management</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <SouvenirsTable initialData={data} />
        )}
      </div>
    </div>
  );
}

export default App;
