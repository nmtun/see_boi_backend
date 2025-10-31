import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Test route
  app.getHttpAdapter().getInstance().get('/', (req, res) => {
    res.json({
      status: 'success',
      message: 'Xin chào, tôi là Tùng đẹp trai!',
      timestamp: new Date().toISOString(),
    });
  });

  const port = configService.get<number>('PORT') || 5000;
  await app.listen(port);


  console.log(`Server is running on: http://localhost:${port}`);
}
bootstrap();
