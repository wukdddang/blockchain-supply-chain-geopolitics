import { ApiProperty } from '@nestjs/swagger';

export class TradeFlowResponseDto {
  @ApiProperty({
    description: 'GeoJSON 타입',
    example: 'FeatureCollection',
  })
  type: string;

  @ApiProperty({
    description: '무역 플로우 피처 배열',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'Feature' },
        geometry: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'LineString' },
            coordinates: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
                example: [
                  [-112.5994359115045, 45.70562800215178],
                  [103.88361230063249, 36.555066531858685],
                ],
              },
            },
          },
        },
        properties: {
          type: 'object',
          properties: {
            reporter_name: { type: 'string', example: 'China' },
            partner_name: { type: 'string', example: 'United States' },
            trade_value: { type: 'number', example: 1500000000 },
            commodity: { type: 'string', example: 'copper' },
            year: { type: 'number', example: 2023 },
          },
        },
      },
    },
  })
  features: any[];

  @ApiProperty({
    description: '메타데이터',
    type: 'object',
    properties: {
      item: { type: 'string', example: 'copper' },
      year: { type: 'number', example: 2023 },
      totalFlows: { type: 'number', example: 25 },
      sourceFiles: {
        type: 'array',
        items: { type: 'string' },
        example: [
          'trade_copper_2023_156_842.geojson',
          'trade_copper_2023_276_156.geojson',
        ],
      },
    },
  })
  metadata: {
    item: string;
    year: number;
    totalFlows: number;
    sourceFiles: string[];
  };
}

export class VechainActivityResponseDto {
  @ApiProperty({
    description: 'VeChain 활동량 데이터 배열',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string', example: '2023-01-01' },
        vtho_burn: { type: 'number', example: 400000000 },
        activity_level: { type: 'string', example: 'very_high' },
      },
    },
  })
  data: Array<{
    date: string;
    vtho_burn: number;
    activity_level: string;
  }>;

  @ApiProperty({
    description: '메타데이터',
    type: 'object',
    properties: {
      source: { type: 'string', example: 'VeChainStats' },
      note: { type: 'string', example: 'Mock data - VeChain 데이터 수집 중' },
      last_updated: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
    },
  })
  metadata: {
    source: string;
    note: string;
    last_updated: string;
  };
}

export class ItemsResponseDto {
  @ApiProperty({
    description: '사용 가능한 상품 목록',
    type: 'array',
    items: { type: 'string' },
    example: ['copper', 'oil', 'plastic_3901'],
  })
  items: string[];

  @ApiProperty({
    description: '응답 생성 시간',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

export class YearsResponseDto {
  @ApiProperty({
    description: '사용 가능한 연도 목록 (최신순)',
    type: 'array',
    items: { type: 'number' },
    example: [2024, 2023, 2022, 2021, 2020, 2019, 2018],
  })
  years: number[];

  @ApiProperty({
    description: '응답 생성 시간',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

export class HealthResponseDto {
  @ApiProperty({
    description: '서버 상태',
    example: 'healthy',
  })
  status: string;

  @ApiProperty({
    description: '응답 생성 시간',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'API 버전',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: '상태 메시지',
    example: '블록체인 공급망 지정학 API 서버가 정상 작동 중입니다.',
  })
  message: string;
}
