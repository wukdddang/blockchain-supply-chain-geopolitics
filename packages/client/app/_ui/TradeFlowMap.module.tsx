"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Map, View } from "ol";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM } from "ol/source";
import { Vector as VectorSource } from "ol/source";
import { GeoJSON } from "ol/format";
import { Style, Stroke, Fill, Text } from "ol/style";
import { fromLonLat } from "ol/proj";
import { LineString, Point } from "ol/geom";
import { Feature } from "ol";
import { useSupplyChain } from "../_context/SupplyChainContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

  const { tradeFlowData, loading, error } = useSupplyChain();

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

  // 국가별 색상 정의
  const getColorByCountry = (country: string): string => {
    const colorMap: Record<string, string> = {
      China: "#ef4444", // 빨간색
      USA: "#3b82f6", // 파란색
      Germany: "#10b981", // 초록색
      Japan: "#f59e0b", // 주황색
      "South Korea": "#8b5cf6", // 보라색
      Taiwan: "#06b6d4", // 청록색
      Singapore: "#ec4899", // 핑크색
      Netherlands: "#84cc16", // 라임색
      "United Kingdom": "#6366f1", // 인디고색
      France: "#f97316", // 주황-빨강색
      Italy: "#14b8a6", // 틸색
      Belgium: "#a855f7", // 자주색
      Switzerland: "#22c55e", // 연한 초록색
      Canada: "#0ea5e9", // 하늘색
      Mexico: "#f43f5e", // 장미색
    };

    return colorMap[country] || "#6b7280"; // 기본 회색
  };

  // Great Circle 곡선 경로 계산 (양방향 고려)
  const createCurvedPath = (
    start: [number, number],
    end: [number, number],
    isReverse: boolean = false,
    offsetMultiplier: number = 0
  ) => {
    const [startLon, startLat] = start;
    const [endLon, endLat] = end;

    // 거리 계산
    const distance = Math.sqrt(
      Math.pow(endLon - startLon, 2) + Math.pow(endLat - startLat, 2)
    );

    // 짧은 거리는 직선으로
    if (distance < 5) {
      return [start, end];
    }

    // 중간점 계산
    const midLon = (startLon + endLon) / 2;
    const midLat = (startLat + endLat) / 2;

    // 곡률 높이 계산 (거리와 위치에 따라 적응적)
    const baseCurvature = Math.min(distance * 0.2, 25);

    // 양방향일 때 offset 적용
    const offsetCurvature = offsetMultiplier * distance * 0.1;
    const curvature = baseCurvature + offsetCurvature;

    // 북반구/남반구에 따라 곡선 방향 결정
    const avgLat = (startLat + endLat) / 2;
    let offsetLat = avgLat > 0 ? midLat + curvature : midLat - curvature;

    // 역방향일 때 반대 방향으로 곡선
    if (isReverse) {
      offsetLat = avgLat > 0 ? midLat - curvature : midLat + curvature;
    }

    // 더 부드러운 곡선을 위한 제어점들
    const controlPoint1: [number, number] = [
      startLon + (midLon - startLon) * 0.3,
      startLat + (offsetLat - startLat) * 0.3,
    ];

    const controlPoint2: [number, number] = [
      endLon + (midLon - endLon) * 0.3,
      endLat + (offsetLat - endLat) * 0.3,
    ];

    // 3차 베지어 곡선으로 더 자연스러운 곡선 생성
    const points: [number, number][] = [];
    const segments = Math.max(15, Math.floor(distance * 2)); // 거리에 따라 세밀도 조정

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;

      // 3차 베지어 곡선 공식
      const lon =
        mt3 * startLon +
        3 * mt2 * t * controlPoint1[0] +
        3 * mt * t2 * controlPoint2[0] +
        t3 * endLon;

      const lat =
        mt3 * startLat +
        3 * mt2 * t * controlPoint1[1] +
        3 * mt * t2 * controlPoint2[1] +
        t3 * endLat;

      points.push([lon, lat]);
    }

    return points;
  };

  // 곡선 중간점에 텍스트 라벨 생성
  const createLabel = (
    pathPoints: [number, number][],
    flowDirection: string,
    tradeValue: number
  ): Feature => {
    const midIndex = Math.floor(pathPoints.length / 2);
    const midPoint = pathPoints[midIndex];

    // 텍스트 라벨 Feature 생성
    const labelFeature = new Feature({
      geometry: new Point(midPoint),
      flow_direction: flowDirection,
      trade_value: tradeValue,
      feature_type: "label",
    });

    // 국가명 추출
    const [origin, destination] = flowDirection.split(" → ");
    const shortOrigin =
      origin.length > 8 ? origin.substring(0, 8) + "..." : origin;
    const shortDestination =
      destination.length > 8
        ? destination.substring(0, 8) + "..."
        : destination;

    // 무역량에 따른 라벨 크기 조정
    const labelSize = Math.min(Math.max(tradeValue / 20000000, 0.8), 1.5);

    labelFeature.setStyle(
      new Style({
        text: new Text({
          text: `${shortOrigin} → ${shortDestination}`,
          font: `bold ${Math.floor(11 * labelSize)}px sans-serif`,
          fill: new Fill({ color: "#1f2937" }),
          stroke: new Stroke({ color: "white", width: 4 }),
          textAlign: "center",
          backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.8)" }),
          padding: [3, 6, 3, 6],
        }),
      })
    );

    return labelFeature;
  };

  // 모든 선의 두께를 동일하게 설정
  const getLineWidthByTradeValue = (): number => {
    return 2; // 모든 선을 동일한 두께로 설정
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
        // 출발 국가 기준으로 색상 결정
        const originCountry = properties.flow_direction?.split(" → ")[0] || "";
        const color = getColorByCountry(originCountry);
        const lineWidth = getLineWidthByTradeValue();

        // 색상에 투명도 추가 (hex to rgba 변환)
        const hexToRgba = (hex: string, alpha: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const rgba = hexToRgba(color, 0.7); // 70% 불투명도

        return new Style({
          stroke: new Stroke({
            color: rgba,
            width: lineWidth,
            lineCap: "round",
            lineJoin: "round",
          }),
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
      // 마우스 이동 이벤트 (화살표와 라벨 피처 지원)
      map.on("pointermove", (evt) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => {
          return feature;
        });

        if (feature) {
          const properties = feature.getProperties();
          const coords = evt.coordinate;
          const pixel = map.getPixelFromCoordinate(coords);

          // 라벨 피처인 경우 간단한 툴팁 표시
          if (properties.feature_type === "label") {
            tooltip.innerHTML = `
              <div class="font-semibold text-sm mb-1">${
                properties.flow_direction
              }</div>
              <div class="text-xs">
                <div><span class="font-medium">무역액:</span> $${formatTradeValue(
                  properties.trade_value
                )}</div>
              </div>
            `;
          } else {
            // 기본 곡선 피처인 경우 상세 툴팁 표시
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
          }

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

  // 무역 데이터 업데이트 (양방향 처리 포함)
  useEffect(() => {
    if (!vectorSourceRef.current || !tradeFlowData) return;

    const vectorSource = vectorSourceRef.current;

    // 기존 피처들 제거
    vectorSource.clear();

    try {
      // GeoJSON 형태의 데이터를 OpenLayers 피처로 변환
      const format = new GeoJSON();
      const originalFeatures = format.readFeatures(tradeFlowData, {
        featureProjection: "EPSG:4326",
        dataProjection: "EPSG:4326",
      });

      // 양방향 무역 흐름 분석
      const tradeFlows: Record<string, Feature[]> = {};
      const bidirectionalPairs: Set<string> = new Set();

      originalFeatures.forEach((feature) => {
        const properties = feature.getProperties();
        const flowDirection = properties.flow_direction;

        if (flowDirection) {
          const [origin, destination] = flowDirection.split(" → ");
          const forwardKey = `${origin}-${destination}`;
          const reverseKey = `${destination}-${origin}`;

          if (!tradeFlows[forwardKey]) {
            tradeFlows[forwardKey] = [];
          }
          tradeFlows[forwardKey].push(feature);

          // 양방향 무역인지 확인
          if (tradeFlows[reverseKey]) {
            bidirectionalPairs.add(forwardKey);
            bidirectionalPairs.add(reverseKey);
          }
        }
      });

      console.log("양방향 무역 쌍:", bidirectionalPairs.size / 2, "개");

      // 모든 피처를 처리 (곡선 + 화살표/라벨)
      const allFeatures: Feature[] = [];

      Object.entries(tradeFlows).forEach(([tradeKey, features]) => {
        const isBidirectional = bidirectionalPairs.has(tradeKey);
        const [origin, destination] = tradeKey.split("-");
        const reverseKey = `${destination}-${origin}`;
        const isReverse =
          bidirectionalPairs.has(reverseKey) && origin > destination;

        features.forEach((feature) => {
          const geometry = feature.getGeometry();
          if (geometry?.getType() === "LineString") {
            const coordinates = (geometry as LineString).getCoordinates();
            if (coordinates.length >= 2) {
              const start = coordinates[0] as [number, number];
              const end = coordinates[coordinates.length - 1] as [
                number,
                number
              ];

              // 양방향일 때 offset 적용
              const offsetMultiplier = isBidirectional
                ? isReverse
                  ? -0.3
                  : 0.3
                : 0;

              // 곡선 경로 생성
              const curvedPath = createCurvedPath(
                start,
                end,
                isReverse,
                offsetMultiplier
              );

              // 새로운 LineString 생성
              const curvedGeometry = new LineString(curvedPath);
              feature.setGeometry(curvedGeometry);

              // 투영 변환
              curvedGeometry.transform("EPSG:4326", "EPSG:3857");

              // 곡선 피처 추가
              allFeatures.push(feature);

              // 라벨 생성 (투영 변환 전 좌표 사용)
              const properties = feature.getProperties();
              const labelFeature = createLabel(
                curvedPath,
                properties.flow_direction,
                properties.trade_value
              );

              // 라벨도 투영 변환
              const labelGeometry = labelFeature.getGeometry();
              if (labelGeometry) {
                labelGeometry.transform("EPSG:4326", "EPSG:3857");
              }
              allFeatures.push(labelFeature);
            }
          }
        });
      });

      // 모든 피처들을 벡터 소스에 추가
      vectorSource.addFeatures(allFeatures);

      console.log(`총 ${allFeatures.length}개 피처 추가됨`);

      // 지도 뷰를 데이터 범위에 맞게 조정
      if (mapInstanceRef.current && allFeatures.length > 0) {
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
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>데이터 로딩 중...</span>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full h-full"
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

      {/* 통계 그래프 */}
      {tradeFlowData && <TradeStatsOverlay tradeFlowData={tradeFlowData} />}
    </div>
  );
};

// 통계 오버레이 컴포넌트
interface TradeStatsOverlayProps {
  tradeFlowData: {
    features: Array<{
      properties: {
        flow_direction: string;
        trade_value: number;
      };
    }>;
    metadata?: {
      totalFlows: number;
    };
  };
}

const TradeStatsOverlay: React.FC<TradeStatsOverlayProps> = ({
  tradeFlowData,
}) => {
  const statsData = useMemo(() => {
    if (!tradeFlowData?.features) return null;

    const features = tradeFlowData.features;

    // 국가별 수출 통계
    const exporterStats: Record<string, { value: number; flows: number }> = {};
    // 국가별 수입 통계
    const importerStats: Record<string, { value: number; flows: number }> = {};

    features.forEach((feature) => {
      const { flow_direction, trade_value } = feature.properties;
      if (flow_direction) {
        const [origin, destination] = flow_direction.split(" → ");

        if (!exporterStats[origin]) {
          exporterStats[origin] = { value: 0, flows: 0 };
        }
        if (!importerStats[destination]) {
          importerStats[destination] = { value: 0, flows: 0 };
        }

        exporterStats[origin].value += trade_value || 0;
        exporterStats[origin].flows += 1;
        importerStats[destination].value += trade_value || 0;
        importerStats[destination].flows += 1;
      }
    });

    // 상위 5개국 데이터 준비
    const topExporters = Object.entries(exporterStats)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 5)
      .map(([country, stats]) => ({
        country,
        value: Math.round(stats.value / 1000000), // 백만 단위
        flows: stats.flows,
      }));

    const topImporters = Object.entries(importerStats)
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 5)
      .map(([country, stats]) => ({
        country,
        value: Math.round(stats.value / 1000000), // 백만 단위
        flows: stats.flows,
      }));

    return { topExporters, topImporters };
  }, [tradeFlowData]);

  if (!statsData) return null;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 p-4 rounded-lg shadow-lg border max-w-lg">
      <div className="flex flex-col space-y-4">
        {/* 제목 */}
        <h4 className="font-semibold text-sm text-gray-800">무역 통계</h4>

        {/* 차트 영역 */}
        <div className="flex space-x-4">
          {/* 상위 수출국 바차트 */}
          <div className="flex-1">
            <h5 className="text-xs font-medium text-gray-600 mb-2">
              상위 수출국 (백만 달러)
            </h5>
            <div style={{ width: "100%", height: 120 }}>
              <ResponsiveContainer>
                <BarChart
                  data={statsData.topExporters}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="country"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip
                    formatter={(value: number) => [`$${value}M`, "무역액"]}
                    labelFormatter={(label: string) => `국가: ${label}`}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 상위 수입국 파이차트 */}
          <div className="flex-1">
            <h5 className="text-xs font-medium text-gray-600 mb-2">
              상위 수입국 분포
            </h5>
            <div style={{ width: "100%", height: 120 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statsData.topImporters}
                    cx="50%"
                    cy="50%"
                    outerRadius={40}
                    dataKey="value"
                    nameKey="country"
                  >
                    {statsData.topImporters.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value}M`, "무역액"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-2">상세 통계</h5>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">주요 수출국</div>
              {statsData.topExporters.slice(0, 3).map((item, index) => (
                <div key={item.country} className="flex justify-between py-1">
                  <span className="text-gray-600">
                    {index + 1}.{" "}
                    {item.country.length > 8
                      ? item.country.slice(0, 8) + "..."
                      : item.country}
                  </span>
                  <span className="font-medium">${item.value}M</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">주요 수입국</div>
              {statsData.topImporters.slice(0, 3).map((item, index) => (
                <div key={item.country} className="flex justify-between py-1">
                  <span className="text-gray-600">
                    {index + 1}.{" "}
                    {item.country.length > 8
                      ? item.country.slice(0, 8) + "..."
                      : item.country}
                  </span>
                  <span className="font-medium">${item.value}M</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 요약 정보 */}
        <div className="border-t pt-2 text-xs text-gray-500">
          <div>총 무역 흐름: {tradeFlowData.metadata?.totalFlows || 0}개</div>
          <div>동일한 선 굵기로 표시</div>
        </div>
      </div>
    </div>
  );
};
