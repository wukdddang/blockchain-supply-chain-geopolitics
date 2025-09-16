"use client";

import React, { useMemo } from "react";
import { useSupplyChain } from "../_context/SupplyChainContext";

interface AnalysisPanelProps {
  className?: string;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  className = "",
}) => {
  const { tradeFlowData, selectedItem, selectedYear, loading } =
    useSupplyChain();

  // 데이터 분석 계산
  const analysisData = useMemo(() => {
    if (!tradeFlowData || !tradeFlowData.features) {
      return null;
    }

    const features = tradeFlowData.features;

    // 총 무역량 계산
    const totalTradeValue = features.reduce((sum, feature) => {
      return sum + (feature.properties.trade_value || 0);
    }, 0);

    // 총 물량 계산
    const totalQuantity = features.reduce((sum, feature) => {
      return sum + (feature.properties.quantity || 0);
    }, 0);

    // 주요 수출국 계산 (출발지 기준)
    const exporterStats: Record<string, { value: number; flows: number }> = {};
    const importerStats: Record<string, { value: number; flows: number }> = {};

    features.forEach((feature) => {
      const { flow_direction, trade_value, reporter_name, partner_name } =
        feature.properties;

      // flow_direction에서 출발지와 도착지 파싱
      if (flow_direction) {
        const [origin, destination] = flow_direction.split(" → ");

        if (!exporterStats[origin]) {
          exporterStats[origin] = { value: 0, flows: 0 };
        }
        if (!importerStats[destination]) {
          importerStats[destination] = { value: 0, flows: 0 };
        }

        exporterStats[origin].value += trade_value;
        exporterStats[origin].flows += 1;
        importerStats[destination].value += trade_value;
        importerStats[destination].flows += 1;
      }
    });

    // 상위 3개 수출국/수입국
    const topExporters = Object.entries(exporterStats)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 3);

    const topImporters = Object.entries(importerStats)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 3);

    return {
      totalTradeValue,
      totalQuantity,
      totalFlows: features.length,
      topExporters,
      topImporters,
      averageTradeValue: totalTradeValue / features.length,
    };
  }, [tradeFlowData]);

  // 품목별 분석 내용
  const getAnalysisContent = () => {
    const year = selectedYear;
    const item = selectedItem;

    const contents: Record<string, Record<number, string>> = {
      semiconductor: {
        2019: "2019년은 미-중 무역분쟁이 심화된 시기로, 미국의 반도체 수입선이 중국에서 대만, 한국으로 다변화되는 현상이 뚜렷이 나타났습니다. 특히 화웨이 제재 이후 글로벌 공급망 재편이 가속화되었습니다.",
        2020: "코로나19 팬데믹으로 인한 디지털 전환 가속화로 반도체 수요가 급증했습니다. 동시에 공급망 차단 리스크가 부각되면서 각국이 반도체 자급률 제고에 나섰습니다.",
        2021: "반도체 대란이 본격화된 해로, 글로벌 공급 부족 현상이 심각했습니다. 이 시기 아시아 지역의 반도체 허브 역할이 더욱 부각되었습니다.",
        2022: "러시아-우크라이나 전쟁과 중국의 제로 코로나 정책으로 공급망이 추가 타격을 받았습니다. 미국의 CHIPS Act 통과로 반도체 리쇼어링 정책이 본격화되었습니다.",
        2023: "지정학적 긴장 완화와 함께 공급망이 점진적으로 회복세를 보였습니다. 그러나 미-중 기술패권 경쟁은 지속되어 공급망의 블록화 현상이 고착화되고 있습니다.",
      },
      copper: {
        2019: "구리는 전기차와 재생에너지 확산의 핵심 원자재로 주목받기 시작했습니다. 중국의 구리 수입 증가가 글로벌 가격 상승을 주도했습니다.",
        2020: "코로나19 초기 수요 감소 후 하반기부터 경기부양책과 그린뉴딜 정책으로 구리 수요가 급반등했습니다.",
        2021: "탄소중립 정책 확산으로 구리 수요가 구조적 증가세를 보였습니다. 공급 부족 우려가 가격 급등을 초래했습니다.",
        2022: "인플레이션 우려와 중국 봉쇄정책으로 구리 시장이 큰 변동성을 보였습니다. 러시아산 구리에 대한 제재 논의가 시장 불안을 가중시켰습니다.",
        2023: "중국 경제 회복 기대와 함께 구리 수요가 안정화되었습니다. 전기차 보급 가속화로 장기적 수요 증가 전망이 유지되고 있습니다.",
      },
      oil: {
        2019: "셰일오일 생산 증가로 미국이 순수출국으로 전환하는 등 글로벌 원유 공급구조가 변화했습니다.",
        2020: "코로나19로 인한 이동 제한으로 원유 수요가 급감하여 WTI 선물가격이 사상 처음 마이너스를 기록했습니다.",
        2021: "백신 보급과 경제활동 재개로 원유 수요가 회복되면서 가격이 급반등했습니다. OPEC+의 감산 연장이 가격 상승을 뒷받침했습니다.",
        2022: "러시아-우크라이나 전쟁으로 에너지 안보가 최대 이슈로 부상했습니다. 러시아산 원유 제재로 글로벌 공급망 재편이 가속화되었습니다.",
        2023: "중국의 경제활동 정상화와 함께 아시아 지역 원유 수요가 회복되었습니다. 그러나 재생에너지 전환 가속화로 장기 전망은 불투명한 상황입니다.",
      },
      plastic: {
        2019: "환경 규제 강화로 일회용 플라스틱 사용 제한이 확산되기 시작했습니다. 재활용 플라스틱에 대한 관심이 증가했습니다.",
        2020: "코로나19로 인한 위생용품과 포장재 수요 급증으로 플라스틱 생산이 증가했습니다. 환경 규제는 일시 완화되었습니다.",
        2021: "탄소중립 정책 확산으로 바이오플라스틱과 재활용 플라스틱 시장이 급성장했습니다. ESG 경영 확산도 플라스틱 시장 변화를 가속화했습니다.",
        2022: "원유가 급등으로 플라스틱 원료비가 상승했습니다. 동시에 순환경제 전환 압력이 더욱 강화되어 업계 구조조정이 본격화되었습니다.",
        2023: "플라스틱 규제가 글로벌하게 강화되는 가운데, 친환경 대체재 개발과 재활용 기술 혁신이 활발히 진행되고 있습니다.",
      },
    };

    return (
      contents[item]?.[year] ||
      "선택하신 연도와 품목에 대한 분석 정보를 준비 중입니다."
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (num: number) => {
    return `$${formatNumber(num)}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      <div className="p-6 border-b">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          {selectedYear}년{" "}
          {selectedItem === "semiconductor"
            ? "반도체"
            : selectedItem === "oil"
            ? "원유"
            : selectedItem === "copper"
            ? "구리"
            : "플라스틱"}{" "}
          분석
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 주요 통계 */}
        {analysisData && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">주요 통계</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">총 무역액</div>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(analysisData.totalTradeValue)}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">무역 흐름 수</div>
                <div className="text-lg font-bold text-green-600">
                  {analysisData.totalFlows}개
                </div>
              </div>
            </div>

            {/* 주요 수출국 */}
            <div className="mb-4">
              <h5 className="font-medium text-gray-700 mb-2">주요 수출국</h5>
              <div className="space-y-1">
                {analysisData.topExporters.map(([country, stats], index) => (
                  <div
                    key={country}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="flex items-center">
                      <span className="w-4 text-gray-400">#{index + 1}</span>
                      <span className="ml-2">{country}</span>
                    </span>
                    <span className="font-medium">
                      {formatCurrency(stats.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 주요 수입국 */}
            <div className="mb-4">
              <h5 className="font-medium text-gray-700 mb-2">주요 수입국</h5>
              <div className="space-y-1">
                {analysisData.topImporters.map(([country, stats], index) => (
                  <div
                    key={country}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="flex items-center">
                      <span className="w-4 text-gray-400">#{index + 1}</span>
                      <span className="ml-2">{country}</span>
                    </span>
                    <span className="font-medium">
                      {formatCurrency(stats.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 분석 내용 */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">분석 인사이트</h4>
          <div className="text-sm text-gray-700 leading-relaxed">
            {getAnalysisContent()}
          </div>
        </div>

        {/* 블록체인과의 연관성 */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-purple-800 mb-2">
            🔗 블록체인 관점
          </h4>
          <div className="text-sm text-purple-700">
            이러한 글로벌 공급망의 변화는 투명성과 추적가능성에 대한 요구를
            증가시키고 있습니다. VeChain과 같은 공급망 특화 블록체인 플랫폼의
            활용도가 높아지는 이유입니다.
          </div>
        </div>
      </div>
    </div>
  );
};
