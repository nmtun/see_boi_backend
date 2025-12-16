import { IsOptional, IsString, IsEnum, IsBoolean, IsArray, IsInt } from 'class-validator';
import { PostType, PostVisibility } from '@prisma/client';
import { CreatePollDto } from './create-poll.dto';

export class CreatePostDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsEnum(PostType)
    type?: PostType = PostType.NORMAL;

    @IsOptional()
    @IsEnum(PostVisibility)
    visibility?: PostVisibility = PostVisibility.PUBLIC;

    @IsOptional()
    @IsBoolean()
    isDraft?: boolean = false;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    tagIds?: number[];

    @IsOptional()
    poll?: CreatePollDto;
}
