"use client";

import React, { useEffect, useRef } from "react";
import { Map, View } from "ol";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM } from "ol/source";
import { Vector as VectorSource } from "ol/source";
import { GeoJSON } from "ol/format";
import { Style, Stroke, Circle, Fill } from "ol/style";
import { fromLonLat } from "ol/proj";
import { useSupplyChain } from "../_context/SupplyChainContext";

interface TradeFlowMapProps {
  className?: string;
}

export const TradeFlowMap: React.FC<TradeFlowMapProps> = ({
  className = "",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { tradeFlowData, loading, error, selectedItem, selectedYear } =
    useSupplyChain();

  // 툴팁용 포맷팅 함수들
  const formatTradeValue = (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatWeight = (weight: number): string => {
    if (weight >= 1e6) return `${(weight / 1e6).toFixed(1)}M`;
    if (weight >= 1e3) return `${(weight / 1e3).toFixed(1)}K`;
    return weight.toFixed(0);
  };

  // 품목별 색상 정의
  const getColorByItem = (item: string): string => {
    switch (item) {
      case "semiconductor":
        return "#3b82f6"; // 파란색
      case "oil":
        return "#ef4444"; // 빨간색
      case "copper":
        return "#f59e0b"; // 주황색
      case "plastic_3901":
        return "#10b981"; // 초록색
      case "plastic_3902":
        return "#16a34a"; // 진한 초록색
      case "plastic_3903":
        return "#22c55e"; // 연한 초록색
      default:
        return "#6b7280"; // 회색
    }
  };

  // 무역량에 따른 선 두께 계산
  const getLineWidthByTradeValue = (tradeValue: number): number => {
    // 무역량을 기준으로 1-10px 사이의 선 두께 결정
    const maxValue = 50000000; // 5천만 달러
    const minWidth = 1;
    const maxWidth = 8;

    const normalizedValue = Math.min(tradeValue / maxValue, 1);
    return minWidth + (maxWidth - minWidth) * normalizedValue;
  };

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // 벡터 소스 생성
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    // 벡터 레이어 생성
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => {
        const properties = feature.getProperties();
        const color = getColorByItem(properties.item);
        const lineWidth = getLineWidthByTradeValue(properties.trade_value);

        return new Style({
          stroke: new Stroke({
            color: color,
            width: lineWidth,
          }),
          // 시작점과 끝점에 원 표시
          geometry: (feature) => {
            const coordinates = feature.getGeometry()?.getCoordinates();
            if (coordinates && coordinates.length > 0) {
              // LineString의 첫 번째와 마지막 좌표에 점 표시
              return feature.getGeometry();
            }
            return feature.getGeometry();
          },
        });
      },
    });

    // 지도 생성
    const map = new Map({
      target: mapRef.current,
      layers: [
        // 기본 타일 레이어 (OpenStreetMap)
        new TileLayer({
          source: new OSM(),
        }),
        // 무역 흐름 벡터 레이어
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([0, 20]), // 세계 지도 중심
        zoom: 2,
        minZoom: 1,
        maxZoom: 10,
      }),
      controls: [], // 기본 컨트롤들 숨김
    });

    mapInstanceRef.current = map;

    // 툴팁 요소 생성
    const tooltip = tooltipRef.current;
    if (tooltip) {
      // 마우스 이동 이벤트
      map.on("pointermove", (evt) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => {
          return feature;
        });

        if (feature) {
          const properties = feature.getProperties();
          const coords = evt.coordinate;
          const pixel = map.getPixelFromCoordinate(coords);

          tooltip.innerHTML = `
            <div class="font-semibold text-sm mb-2">${
              properties.flow_direction
            }</div>
            <div class="text-xs space-y-1">
              <div><span class="font-medium">무역액:</span> $${formatTradeValue(
                properties.trade_value
              )}</div>
              <div><span class="font-medium">물량:</span> ${formatWeight(
                properties.net_weight
              )} tons</div>
              <div><span class="font-medium">품목:</span> ${
                properties.item
              }</div>
              <div><span class="font-medium">연도:</span> ${
                properties.year
              }</div>
            </div>
          `;

          tooltip.style.display = "block";
          tooltip.style.left = `${pixel[0] + 10}px`;
          tooltip.style.top = `${pixel[1] - 10}px`;

          // 커서 스타일 변경
          map.getTargetElement().style.cursor = "pointer";
        } else {
          tooltip.style.display = "none";
          map.getTargetElement().style.cursor = "";
        }
      });

      // 마우스가 지도를 벗어날 때 툴팁 숨김
      map.getTargetElement().addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
    }

    // 지도 리사이즈 이벤트 처리
    const handleResize = () => {
      map.updateSize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // 무역 데이터 업데이트
  useEffect(() => {
    if (!vectorSourceRef.current || !tradeFlowData) return;

    const vectorSource = vectorSourceRef.current;

    // 기존 피처들 제거
    vectorSource.clear();

    try {
      // GeoJSON 형태의 데이터를 OpenLayers 피처로 변환
      const format = new GeoJSON();
      const features = format.readFeatures(tradeFlowData, {
        featureProjection: "EPSG:3857", // Web Mercator
        dataProjection: "EPSG:4326", // WGS84
      });

      // 피처들을 벡터 소스에 추가
      vectorSource.addFeatures(features);

      // 지도 뷰를 데이터 범위에 맞게 조정
      if (mapInstanceRef.current && features.length > 0) {
        const extent = vectorSource.getExtent();
        mapInstanceRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 6,
        });
      }
    } catch (error) {
      console.error("GeoJSON 데이터 처리 오류:", error);
    }
  }, [tradeFlowData]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg ${className}`}
      >
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">데이터 로드 오류</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>데이터 로딩 중...</span>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: "400px" }}
      >
        {/* 지도가 여기에 렌더링됩니다 */}
      </div>

      {/* 툴팁 */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-gray-900 text-white p-3 rounded-lg shadow-xl z-20 max-w-xs"
        style={{ display: "none" }}
      >
        {/* 툴팁 내용이 JavaScript로 동적 생성됩니다 */}
      </div>

      {/* 범례 */}
      {tradeFlowData && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg border">
          <h4 className="font-semibold text-sm mb-2">무역 흐름 범례</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-1 rounded"
                style={{ backgroundColor: getColorByItem(selectedItem) }}
              ></div>
              <span>
                {selectedItem} ({selectedYear})
              </span>
            </div>
            <div className="text-gray-500 mt-1">선 두께: 무역량 비례</div>
            <div className="text-gray-500">
              총 {tradeFlowData.metadata.totalFlows}개 흐름
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
