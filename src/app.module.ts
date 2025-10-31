import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { dbConfig } from './config/dbconfig';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: `.env`,
    }),
    SequelizeModule.forRootAsync({
      useFactory: (configService: ConfigService) => dbConfig(configService),
      inject: [ConfigService],
    }),
    UserModule,
  ],
})
export class AppModule {}
