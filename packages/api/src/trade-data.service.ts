import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TradeDataService {
  // scripts 폴더의 data/output 경로
  private readonly dataPath = path.join(
    process.cwd(),
    '../scripts/data/output',
  );

  /**
   * 특정 상품과 연도에 대한 모든 무역 플로우 데이터를 가져옵니다
   * @param item 상품 (copper, oil, plastic_3901, semiconductor)
   * @param year 연도 (2018-2024)
   * @returns GeoJSON 형태의 무역 플로우 데이터 배열
   */
  async getTradeFlow(item: string, year: number): Promise<any> {
    try {
      // 해당 item과 year로 시작하는 모든 파일을 찾습니다
      const files = await fs.readdir(this.dataPath);
      let matchingFiles: string[] = [];

      if (item === 'semiconductor') {
        // semiconductor의 경우 8541, 8542 두 가지 HS 코드가 있음
        const pattern1 = `trade_semiconductor_8541_${year}_`;
        const pattern2 = `trade_semiconductor_8542_${year}_`;
        matchingFiles = files.filter(
          (file) =>
            (file.startsWith(pattern1) || file.startsWith(pattern2)) &&
            file.endsWith('.geojson'),
        );
      } else {
        // 다른 상품들의 경우 기존 로직 사용
        const pattern = `trade_${item}_${year}_`;
        matchingFiles = files.filter(
          (file) => file.startsWith(pattern) && file.endsWith('.geojson'),
        );
      }

      if (matchingFiles.length === 0) {
        throw new NotFoundException(
          `${item} 상품의 ${year}년 데이터를 찾을 수 없습니다.`,
        );
      }

      // 모든 매칭 파일들의 데이터를 읽어서 합칩니다
      const features: any[] = [];

      for (const fileName of matchingFiles) {
        const filePath = path.join(this.dataPath, fileName);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const geoData = JSON.parse(fileContent);

        if (geoData.features && Array.isArray(geoData.features)) {
          features.push(...geoData.features);
        }
      }

      // 통합된 GeoJSON 반환
      return {
        type: 'FeatureCollection',
        features: features,
        metadata: {
          item: item,
          year: year,
          totalFlows: features.length,
          sourceFiles: matchingFiles,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`데이터 조회 중 오류 발생:`, error);
      throw new NotFoundException(
        `${item} 상품의 ${year}년 데이터 처리 중 오류가 발생했습니다.`,
      );
    }
  }

  /**
   * 사용 가능한 상품 목록을 반환합니다
   */
  async getAvailableItems(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.dataPath);
      const items = new Set<string>();

      files.forEach((file) => {
        if (file.startsWith('trade_') && file.endsWith('.geojson')) {
          // trade_copper_2023_156_842.geojson → copper 추출
          // trade_semiconductor_8541_2023_156_842.geojson → semiconductor 추출
          const parts = file.split('_');
          if (parts.length >= 3) {
            let item = parts[1];
            // plastic의 경우 HS 코드가 포함되어 있음 (plastic_3901)
            if (parts[1] === 'plastic' && parts.length > 3) {
              item = `${parts[1]}_${parts[2]}`;
            }
            // semiconductor의 경우 HS 코드가 포함되어 있음 (semiconductor_8541, semiconductor_8542)
            // 하지만 API에서는 단순히 'semiconductor'로 통합해서 반환
            if (parts[1] === 'semiconductor') {
              item = 'semiconductor';
            }
            items.add(item);
          }
        }
      });

      return Array.from(items).sort();
    } catch (error) {
      console.error('사용 가능한 상품 목록 조회 중 오류:', error);
      return [];
    }
  }

  /**
   * 사용 가능한 연도 목록을 반환합니다
   */
  async getAvailableYears(): Promise<number[]> {
    try {
      const files = await fs.readdir(this.dataPath);
      const years = new Set<number>();

      files.forEach((file) => {
        if (file.startsWith('trade_') && file.endsWith('.geojson')) {
          // trade_copper_2023_156_842.geojson에서 2023 추출
          // trade_semiconductor_8541_2023_156_842.geojson에서 2023 추출
          const parts = file.split('_');
          if (parts.length >= 3) {
            let yearIndex = 2; // 기본값
            if (parts[1] === 'plastic') {
              yearIndex = 3; // plastic_3901_2023_...
            } else if (parts[1] === 'semiconductor') {
              yearIndex = 3; // semiconductor_8541_2023_...
            }
            const year = parseInt(parts[yearIndex]);
            if (!isNaN(year)) {
              years.add(year);
            }
          }
        }
      });

      return Array.from(years).sort((a, b) => b - a); // 최신 연도부터
    } catch (error) {
      console.error('사용 가능한 연도 목록 조회 중 오류:', error);
      return [];
    }
  }

  /**
   * VeChain 활동 데이터 (아직 수집 중이므로 Mock 데이터로 대체)
   */
  async getVechainActivity(): Promise<any> {
    // TODO: VeChain 데이터가 준비되면 실제 파일에서 읽어오도록 수정
    const mockData = [
      { date: '2018-01-01', vtho_burn: 150000000, activity_level: 'medium' },
      { date: '2019-01-01', vtho_burn: 220000000, activity_level: 'high' },
      { date: '2020-01-01', vtho_burn: 180000000, activity_level: 'medium' },
      { date: '2021-01-01', vtho_burn: 350000000, activity_level: 'very_high' },
      { date: '2022-01-01', vtho_burn: 280000000, activity_level: 'high' },
      { date: '2023-01-01', vtho_burn: 400000000, activity_level: 'very_high' },
      { date: '2024-01-01', vtho_burn: 320000000, activity_level: 'high' },
    ];

    return {
      data: mockData,
      metadata: {
        source: 'VeChainStats',
        note: 'Mock data - VeChain 데이터 수집 중',
        last_updated: new Date().toISOString(),
      },
    };
  }
}
