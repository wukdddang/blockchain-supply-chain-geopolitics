"use client";

import { useState, useEffect } from "react";

export default function TestPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:4000/api/trade-flow/copper/2023"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API 테스트 페이지</h1>

      {loading && <p>로딩 중...</p>}
      {error && <p className="text-red-500">에러: {error}</p>}

      {data && (
        <div>
          <p className="text-green-600">✅ API 연결 성공!</p>
          <pre className="bg-gray-100 p-4 rounded mt-4 text-xs overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
