import { Controller } from '@nestjs/common';
import { UploadService } from './upload.service';
import { Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { ApiConsumes, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { storage } from 'src/utils/cloudinary.storage';
import { CustomRateLimit } from 'src/auth/decorator/throttle.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('image')
  @CustomRateLimit(10, 60000) // 10 uploads per minute
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  @ApiOperation({
    summary: 'Upload ảnh lên Cloudinary',
    description: 'Upload ảnh lên Cloudinary và trả về URL ảnh'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh để upload'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Upload thành công' })
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (file && (file as any).secure_url) {
      return { imageUrl: (file as any).secure_url };
    }
    throw new Error('Upload failed');
  }
}
