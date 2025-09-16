"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// 품목 타입 정의
type CommodityItem = "semiconductor" | "oil" | "copper" | "plastic_3901" | "plastic_3902" | "plastic_3903";

// 무역 흐름 데이터 타입 정의
interface TradeFlowFeature {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties: {
    reporter_name: string;
    partner_name: string;
    trade_value: number;
    net_weight: number;
    quantity: number;
    item: string;
    year: number;
    flow_direction: string;
  };
}

interface TradeFlowData {
  type: "FeatureCollection";
  features: TradeFlowFeature[];
  metadata: {
    item: string;
    year: number;
    totalFlows: number;
    sourceFiles: string[];
  };
}

// Context 타입 정의
interface SupplyChainContextType {
  // 데이터 상태
  selectedYear: number;
  selectedItem: CommodityItem;
  tradeFlowData: TradeFlowData | null;
  loading: boolean;
  error: string | null;

  // 액션 함수들
  연도를_변경_한다: (year: number) => void;
  품목을_변경_한다: (item: CommodityItem) => void;
  무역_데이터를_조회_한다: () => Promise<void>;

  // 상태 업데이트 함수들
  setTradeFlowData: React.Dispatch<React.SetStateAction<TradeFlowData | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// Provider Props 정의
interface SupplyChainProviderProps {
  children: React.ReactNode;
}

// Context 생성
const SupplyChainContext = createContext<SupplyChainContextType | undefined>(
  undefined
);

// Provider 컴포넌트
export const SupplyChainProvider: React.FC<SupplyChainProviderProps> = ({
  children,
}) => {
  // 데이터 상태
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedItem, setSelectedItem] =
    useState<CommodityItem>("semiconductor");
  const [tradeFlowData, setTradeFlowData] = useState<TradeFlowData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 액션 함수들
  const 연도를_변경_한다 = (year: number) => {
    setSelectedYear(year);
  };

  const 품목을_변경_한다 = (item: CommodityItem) => {
    setSelectedItem(item);
  };

  const 무역_데이터를_조회_한다 = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`API 호출 시작: ${selectedItem} ${selectedYear}`);

      const response = await fetch(
        `http://localhost:4000/api/trade-flow/${selectedItem}/${selectedYear}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`API 응답 상태: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`API 응답 데이터:`, data);
      setTradeFlowData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "무역 데이터 조회 중 알 수 없는 오류가 발생했습니다.";

      setError(errorMessage);
      console.error("무역 데이터 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 연도나 품목이 변경될 때 데이터 재조회
  useEffect(() => {
    무역_데이터를_조회_한다();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedItem]);

  // Context value
  const contextValue: SupplyChainContextType = {
    // 데이터 상태
    selectedYear,
    selectedItem,
    tradeFlowData,
    loading,
    error,

    // 액션 함수들
    연도를_변경_한다,
    품목을_변경_한다,
    무역_데이터를_조회_한다,

    // 상태 업데이트 함수들
    setTradeFlowData,
    setLoading,
    setError,
  };

  return (
    <SupplyChainContext.Provider value={contextValue}>
      {children}
    </SupplyChainContext.Provider>
  );
};

// 커스텀 훅
export const useSupplyChain = () => {
  const context = useContext(SupplyChainContext);
  if (context === undefined) {
    throw new Error("useSupplyChain must be used within a SupplyChainProvider");
  }
  return context;
};

// 품목 옵션 상수
export const COMMODITY_OPTIONS: {
  value: CommodityItem;
  label: string;
  description: string;
}[] = [
  { value: "semiconductor", label: "반도체", description: "8541, 8542" },
  { value: "oil", label: "원유", description: "2709" },
  { value: "copper", label: "구리", description: "7403" },
  { value: "plastic", label: "플라스틱", description: "3901, 3902, 3903" },
];

// 연도 옵션 상수
export const YEAR_OPTIONS = [2019, 2020, 2021, 2022, 2023];
