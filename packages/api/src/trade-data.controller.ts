import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { TradeDataService } from './trade-data.service';
import {
  TradeFlowResponseDto,
  VechainActivityResponseDto,
  ItemsResponseDto,
  YearsResponseDto,
  HealthResponseDto,
} from './dto/trade-flow.dto';

@ApiTags('trade-flow')
@Controller('api')
export class TradeDataController {
  constructor(private readonly tradeDataService: TradeDataService) {}

  /**
   * 특정 상품과 연도의 무역 플로우 데이터 조회
   * GET /api/trade-flow/copper/2023
   */
  @Get('trade-flow/:item/:year')
  @ApiOperation({
    summary: '무역 플로우 데이터 조회',
    description:
      '특정 상품과 연도에 대한 글로벌 무역 플로우 데이터를 GeoJSON 형태로 반환합니다.',
  })
  @ApiParam({
    name: 'item',
    description: '상품명 (copper, oil, plastic_3901 등)',
    example: 'copper',
  })
  @ApiParam({
    name: 'year',
    description: '연도 (2018-2024)',
    example: '2023',
  })
  @ApiResponse({
    status: 200,
    description: '무역 플로우 데이터 조회 성공',
    type: TradeFlowResponseDto,
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 (유효하지 않은 연도 또는 상품명)',
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async getTradeFlow(@Param('item') item: string, @Param('year') year: string) {
    try {
      const yearNum = parseInt(year, 10);

      if (isNaN(yearNum)) {
        throw new HttpException(
          '연도는 숫자여야 합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (yearNum < 2018 || yearNum > 2024) {
        throw new HttpException(
          '지원하는 연도 범위는 2018-2024입니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.tradeDataService.getTradeFlow(item, yearNum);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Trade flow 데이터 조회 오류:', error);
      throw new HttpException(
        '서버 내부 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * VeChain 네트워크 활동량 데이터 조회
   * GET /api/vechain/activity
   */
  @Get('vechain/activity')
  @ApiTags('vechain')
  @ApiOperation({
    summary: 'VeChain 네트워크 활동량 조회',
    description:
      'VeChain 네트워크의 VTHO 소모량 및 활동량 데이터를 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'VeChain 활동량 데이터 조회 성공',
    type: VechainActivityResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async getVechainActivity() {
    try {
      return await this.tradeDataService.getVechainActivity();
    } catch (error) {
      console.error('VeChain 데이터 조회 오류:', error);
      throw new HttpException(
        'VeChain 데이터 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 사용 가능한 상품 목록 조회
   * GET /api/items
   */
  @Get('items')
  @ApiTags('metadata')
  @ApiOperation({
    summary: '사용 가능한 상품 목록 조회',
    description:
      '현재 데이터베이스에서 조회 가능한 모든 상품 목록을 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '상품 목록 조회 성공',
    type: ItemsResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async getAvailableItems() {
    try {
      return {
        items: await this.tradeDataService.getAvailableItems(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('상품 목록 조회 오류:', error);
      throw new HttpException(
        '상품 목록 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 사용 가능한 연도 목록 조회
   * GET /api/years
   */
  @Get('years')
  @ApiTags('metadata')
  @ApiOperation({
    summary: '사용 가능한 연도 목록 조회',
    description:
      '현재 데이터베이스에서 조회 가능한 모든 연도 목록을 최신순으로 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '연도 목록 조회 성공',
    type: YearsResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async getAvailableYears() {
    try {
      return {
        years: await this.tradeDataService.getAvailableYears(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('연도 목록 조회 오류:', error);
      throw new HttpException(
        '연도 목록 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * API 상태 확인 (Health Check)
   * GET /api/health
   */
  @Get('health')
  @ApiTags('metadata')
  @ApiOperation({
    summary: 'API 상태 확인',
    description: 'API 서버의 현재 상태와 버전 정보를 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'API 상태 확인 성공',
    type: HealthResponseDto,
  })
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      message: '블록체인 공급망 지정학 API 서버가 정상 작동 중입니다.',
    };
  }
}
