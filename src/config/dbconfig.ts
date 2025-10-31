import { SequelizeModuleOptions } from "@nestjs/sequelize";
import { ConfigService } from "@nestjs/config";

export const dbConfig = (configService: ConfigService): SequelizeModuleOptions => ({
  dialect: 'mysql',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  autoLoadModels: true, // Tự động load các model
  synchronize: true, // Tự động tạo bảng nếu chưa có 
  sync: { alter: true }, // Cập nhật bảng theo model nếu có thay đổi
});
