import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
    constructor(private prisma: PrismaService) { }

    async searchUsers(query: string) {
        const users = await this.prisma.user.findMany({
            where: {
                OR: [
                    {
                        fullName: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        userName: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            select: { id: true, fullName: true, userName: true, email: true, avatarUrl: true },
        })

        return users;
    }

    async searchPosts(query: string, limit: number = 50) {
        // Tìm kiếm trong title, content, contentText, và contentJson
        // Sử dụng PostgreSQL full-text search với ranking
        const posts = await this.prisma.$queryRaw<any[]>`
            SELECT 
                p.id,
                p.title,
                p."contentText",
                p.content,
                p."thumbnailUrl",
                p."createdAt",
                p."userId",
                u."fullName",
                u."userName",
                u."avatarUrl",
                COUNT(DISTINCT pl."userId") as "likeCount",
                COUNT(DISTINCT c.id) as "commentCount",
                (
                    ts_rank(
                        to_tsvector('english', 
                            COALESCE(p.title, '') || ' ' || 
                            COALESCE(p."contentText", '') || ' ' || 
                            COALESCE(p.content, '') || ' ' ||
                            COALESCE(p."contentJson"::text, '')
                        ),
                        plainto_tsquery('english', ${query})
                    ) * 2 +
                    similarity(COALESCE(p.title, ''), ${query}) * 3 +
                    similarity(COALESCE(p."contentText", '') || ' ' || COALESCE(p.content, ''), ${query})
                ) as relevance
            FROM "Post" p
            LEFT JOIN "User" u ON p."userId" = u.id
            LEFT JOIN "PostLike" pl ON p.id = pl."postId"
            LEFT JOIN "Comment" c ON p.id = c."postId"
            WHERE 
                p.status = 'VISIBLE' 
                AND p."isDraft" = false
                AND (
                    to_tsvector('english', 
                        COALESCE(p.title, '') || ' ' || 
                        COALESCE(p."contentText", '') || ' ' || 
                        COALESCE(p.content, '') || ' ' ||
                        COALESCE(p."contentJson"::text, '')
                    ) @@ plainto_tsquery('english', ${query})
                    OR COALESCE(p.title, '') ILIKE ${'%' + query + '%'}
                    OR COALESCE(p."contentText", '') ILIKE ${'%' + query + '%'}
                    OR COALESCE(p.content, '') ILIKE ${'%' + query + '%'}
                    OR COALESCE(p."contentJson"::text, '') ILIKE ${'%' + query + '%'}
                )
            GROUP BY p.id, u.id
            ORDER BY relevance DESC, p."createdAt" DESC
            LIMIT ${limit}
        `;

        return posts.map(post => ({
            id: post.id,
            title: post.title,
            contentText: post.contentText || post.content, // Fallback nếu contentText null
            thumbnailUrl: post.thumbnailUrl,
            createdAt: post.createdAt,
            likeCount: parseInt(post.likeCount) || 0,
            commentCount: parseInt(post.commentCount) || 0,
            relevance: parseFloat(post.relevance) || 0,
            user: {
                id: post.userId,
                fullName: post.fullName,
                userName: post.userName,
                avatarUrl: post.avatarUrl,
            },
        }));
    }
}
