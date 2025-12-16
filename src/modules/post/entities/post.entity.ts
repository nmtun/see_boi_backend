import { PostType, PostVisibility, PostStatus } from '@prisma/client';

export class Posts {
  id: number;
  userId: number;
  title: string | null;
  content: string | null;
  type: PostType;
  visibility: PostVisibility;
  status: PostStatus;
  isDraft: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Posts>) {
    Object.assign(this, partial);
  }
}
