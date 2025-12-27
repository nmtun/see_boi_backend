import { IsOptional, IsString, IsEnum, IsBoolean, IsArray, IsInt, IsObject, MaxLength } from 'class-validator';
import { PostType, PostVisibility } from '@prisma/client';
import { CreatePollDto } from './create-poll.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
    @ApiPropertyOptional({
        description: 'Tiêu đề của bài viết',
        example: 'Tiêu đề bài viết mẫu',
        type: String,
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Nội dung của bài viết (hỗ trợ Markdown)',
        example: 'Đây là nội dung bài viết...',
        type: String,
    })
    @IsOptional()
    @IsString()
    content?: string;

  @ApiPropertyOptional({
    description: 'Nội dung rich text dạng JSON (ProseMirror/Tiptap)',
    example: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Xin chào' }] }] },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  contentJson?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện/thumbnail của bài viết (được upload riêng qua field thumbnail)',
    example: 'https://res.cloudinary.com/demo/image/upload/posts/thumbnail.jpg',
    type: String,
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Nội dung plain text rút gọn từ editor (dùng preview/search)',
    example: 'Xin chào',
    type: String,
    maxLength: 20000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  contentText?: string;

    @ApiPropertyOptional({
        description: 'Loại bài viết',
        enum: PostType,
        example: PostType.NORMAL,
        default: PostType.NORMAL,
    })
    @IsOptional()
    @IsEnum(PostType)
    type?: PostType = PostType.NORMAL;

    @ApiPropertyOptional({
        description: 'Mức độ hiển thị của bài viết',
        enum: PostVisibility,
        example: PostVisibility.PUBLIC,
        default: PostVisibility.PUBLIC,
    })
    @IsOptional()
    @IsEnum(PostVisibility)
    visibility?: PostVisibility = PostVisibility.PUBLIC;

    @ApiPropertyOptional({
        description: 'Bài viết là bản nháp (chưa xuất bản)',
        example: false,
        default: false,
        type: Boolean,
    })
    @IsOptional()
    @IsBoolean()
    isDraft?: boolean = false;

    @ApiPropertyOptional({
        description: 'Danh sách ID của các tags đính kèm',
        example: [1, 2, 3],
        type: [Number],
    })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    tagIds?: number[];

    @ApiPropertyOptional({
        description: 'Thông tin poll (nếu bài viết là loại POLL)',
        type: () => CreatePollDto,
    })
    @IsOptional()
    poll?: CreatePollDto;
}
