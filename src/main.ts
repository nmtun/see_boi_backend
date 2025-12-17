import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS configuration
  app.enableCors({
    origin: true, // Cho phép tất cả origins (có thể thay bằng mảng cụ thể như ['http://localhost:3000'])
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Test route
  app.getHttpAdapter().getInstance().get('/', (req, res) => {
    res.json({
      status: 'success',
      message: 'Xin chào, tôi là Tùng đẹp trai!',
      timestamp: new Date().toISOString(),
    });
  });

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT') || 6789;
  await app.listen(port);


  console.log(`Server is running on: http://localhost:${port}`);
}
bootstrap();
