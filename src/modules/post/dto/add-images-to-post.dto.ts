import { IsArray, IsString, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddImagesToPostDto {
  @ApiProperty({
    description: 'Mảng các link ảnh cần thêm vào post',
    example: [
      'https://res.cloudinary.com/demo/image/upload/v123/image1.jpg',
      'https://res.cloudinary.com/demo/image/upload/v123/image2.jpg',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 link ảnh' })
  @IsString({ each: true, message: 'Mỗi phần tử phải là một chuỗi URL' })
  imageUrls: string[];

  @ApiProperty({
    description: 'ID của post cần thêm ảnh',
    example: 1,
    type: Number,
  })
  @IsInt()
  postId: number;

  @ApiProperty({
    description: 'ID của user (tác giả post)',
    example: 1,
    type: Number,
  })
  @IsInt()
  userId: number;
}

