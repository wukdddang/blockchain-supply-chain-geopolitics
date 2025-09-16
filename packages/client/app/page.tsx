"use client";

import { SupplyChainProvider } from "./_context/SupplyChainContext";
import { ControlPanel } from "./_ui/ControlPanel.module";
import { AnalysisPanel } from "./_ui/AnalysisPanel.module";
import dynamic from "next/dynamic";

// OpenLayers 컴포넌트를 동적 로딩으로 처리
const TradeFlowMap = dynamic(
  () =>
    import("./_ui/TradeFlowMap.module").then((mod) => ({
      default: mod.TradeFlowMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">지도 로딩 중...</div>
      </div>
    ),
  }
);

function HomeContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🌍 블록체인 공급망 지정학 분석
          </h1>
          <p className="text-gray-600">
            글로벌 무역 데이터를 통해 지정학적 변화가 공급망에 미치는 영향을
            분석합니다
          </p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex h-[calc(100vh-140px)]">
        {/* 좌측 제어 패널 */}
        <div className="w-80 flex-shrink-0 p-4">
          <ControlPanel />
        </div>

        {/* 중앙 지도 영역 */}
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg shadow-lg border overflow-hidden h-full">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">
                글로벌 무역 흐름 시각화
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                선에 마우스를 올리면 상세 정보를 확인할 수 있습니다
              </p>
            </div>
            <TradeFlowMap className="h-[calc(100%-80px)]" />
          </div>
        </div>

        {/* 우측 분석 패널 */}
        <div className="w-80 flex-shrink-0 p-4">
          <AnalysisPanel />
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="text-center text-gray-500 text-sm">
          <p>
            데이터 출처: UN Comtrade Database | 지정학적 분석: 개발자 인사이트 |
            블록체인 데이터: VeChain Network
          </p>
          <p className="mt-2">
            본 분석은 공개 데이터를 기반으로 한 개인적 견해이며, 투자 조언이
            아닙니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <SupplyChainProvider>
      <HomeContent />
    </SupplyChainProvider>
  );
}
