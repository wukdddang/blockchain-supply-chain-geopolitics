import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화 (프론트엔드에서 접근 가능하도록)
  app.enableCors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'], // Next.js 기본 포트
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('블록체인 공급망 지정학 API')
    .setDescription(
      '지정학적 변화에 따른 글로벌 공급망 재편과 블록체인의 역할을 분석하는 API',
    )
    .setVersion('1.0')
    .addTag('trade-flow', '무역 플로우 데이터 관련 API')
    .addTag('vechain', 'VeChain 네트워크 활동량 데이터 API')
    .addTag('metadata', '메타데이터 조회 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: '블록체인 공급망 지정학 API 문서',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  // API 포트를 4000로 설정 (프론트엔드와 구분)
  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log('🚀 블록체인 공급망 지정학 API 서버가 시작되었습니다!');
  console.log(`📡 서버 주소: http://localhost:${port}`);
  console.log(`🔍 API 상태 확인: http://localhost:${port}/api/health`);
  console.log(`📚 API 문서: http://localhost:${port}/api/docs`);
}
bootstrap();
