"use client";

import React from "react";
import {
  useSupplyChain,
  COMMODITY_OPTIONS,
  YEAR_OPTIONS,
} from "../_context/SupplyChainContext";

interface ControlPanelProps {
  className?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  className = "",
}) => {
  const {
    selectedYear,
    selectedItem,
    연도를_변경_한다,
    품목을_변경_한다,
    loading,
    tradeFlowData,
  } = useSupplyChain();

  return (
    <div className={`h-full overflow-y-auto p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          글로벌 공급망 분석 대시보드
        </h2>
        <p className="text-sm text-gray-600">
          연도와 품목을 선택하여 무역 흐름을 시각화하세요
        </p>
      </div>

      <div className="space-y-6">
        {/* 연도 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            분석 연도
          </label>
          <div className="grid grid-cols-4 gap-2">
            {YEAR_OPTIONS.map((year) => (
              <button
                key={year}
                onClick={() => 연도를_변경_한다(year)}
                disabled={loading}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  ${
                    selectedYear === year
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                  ${
                    loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }
                `}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* 품목 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            분석 품목
          </label>
          <div className="space-y-2">
            {COMMODITY_OPTIONS.map((commodity) => (
              <button
                key={commodity.value}
                onClick={() => 품목을_변경_한다(commodity.value)}
                disabled={loading}
                className={`
                  w-full px-4 py-3 text-left rounded-lg border transition-all duration-200
                  ${
                    selectedItem === commodity.value
                      ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                  ${
                    loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {commodity.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      HS Code: {commodity.description}
                    </div>
                  </div>
                  {selectedItem === commodity.value && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 현재 선택 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">현재 선택</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">연도:</span>
              <span className="font-medium">{selectedYear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">품목:</span>
              <span className="font-medium">
                {COMMODITY_OPTIONS.find((c) => c.value === selectedItem)?.label}
              </span>
            </div>
            {tradeFlowData && (
              <div className="flex justify-between">
                <span className="text-gray-600">무역 흐름:</span>
                <span className="font-medium text-blue-600">
                  {tradeFlowData.metadata.totalFlows}개
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-3 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm">데이터 로딩 중...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
