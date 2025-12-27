BEGIN;
 
--------------------------------------------------
-- USER FOLLOW
--------------------------------------------------
INSERT INTO "UserFollow" ("followerId","followingId")
VALUES
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  (SELECT id FROM "User" WHERE email='b@gmail.com')
),
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  (SELECT id FROM "User" WHERE email='c@gmail.com')
),
(
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  (SELECT id FROM "User" WHERE email='a@gmail.com')
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- POST
--------------------------------------------------
INSERT INTO "Post"
("userId","title","content","type","visibility","status","isDraft","createdAt","updatedAt")
VALUES
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  'Bài viết đầu tiên',
  'Nội dung bài viết của A',
  'NORMAL','PUBLIC','VISIBLE',false,NOW(),NOW()
),
(
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  'Chia sẻ kinh nghiệm',
  'Nội dung bài viết của B',
  'NORMAL','FOLLOWERS','VISIBLE',false,NOW(),NOW()
),
(
  (SELECT id FROM "User" WHERE email='c@gmail.com'),
  'Khảo sát nhỏ',
  'Bạn thích ngôn ngữ nào?',
  'POLL','PUBLIC','VISIBLE',false,NOW(),NOW()
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- TAG
--------------------------------------------------
INSERT INTO "Tag" ("name")
VALUES 
  ('Tarot'),
  ('Tử Vi'),
  ('Tướng Số'),
  ('Phong Thủy'),
  ('Chiêm Tinh'),
  ('Nhân Tướng Học'),
  ('Bói Bài'),
  ('Thần Số Học'),
  ('Cung Hoàng Đạo'),
  ('Lá Số Tử Vi')
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- POST TAG
--------------------------------------------------
INSERT INTO "PostTag" ("postId","tagId")
VALUES
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "Tag" WHERE name='Tarot' LIMIT 1)
),
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "Tag" WHERE name='Tử Vi' LIMIT 1)
),
(
  (SELECT id FROM "Post" WHERE title='Chia sẻ kinh nghiệm' LIMIT 1),
  (SELECT id FROM "Tag" WHERE name='Tướng Số' LIMIT 1)
),
(
  (SELECT id FROM "Post" WHERE title='Khảo sát nhỏ' LIMIT 1),
  (SELECT id FROM "Tag" WHERE name='Cung Hoàng Đạo' LIMIT 1)
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- COMMENT
--------------------------------------------------
INSERT INTO "Comment"
("postId","userId","content","isAnonymous","createdAt")
VALUES
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  'Bài viết hay quá!',
  false,NOW()
),
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='c@gmail.com'),
  'Mình cũng thấy vậy',
  false,NOW()
);
 
INSERT INTO "Comment"
("postId","userId","parentId","content","isAnonymous","createdAt")
VALUES
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  (SELECT id FROM "Comment" WHERE content='Bài viết hay quá!' LIMIT 1),
  'Cảm ơn bạn nhé!',
  false,NOW()
);
 
--------------------------------------------------
-- COMMENT VOTE
--------------------------------------------------
INSERT INTO "CommentVote" ("commentId","userId","type")
VALUES
(
  (SELECT id FROM "Comment" WHERE content='Bài viết hay quá!' LIMIT 1),
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  'UP'
),
(
  (SELECT id FROM "Comment" WHERE content='Mình cũng thấy vậy' LIMIT 1),
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  'UP'
),
(
  (SELECT id FROM "Comment" WHERE content='Bài viết hay quá!' LIMIT 1),
  (SELECT id FROM "User" WHERE email='c@gmail.com'),
  'DOWN'
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- POST LIKE
--------------------------------------------------
INSERT INTO "PostLike" ("postId","userId","createdAt")
VALUES
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  NOW()
),
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='c@gmail.com'),
  NOW()
),
(
  (SELECT id FROM "Post" WHERE title='Chia sẻ kinh nghiệm' LIMIT 1),
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  NOW()
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- POLL
--------------------------------------------------
INSERT INTO "Poll" ("postId","expiresAt")
VALUES
(
  (SELECT id FROM "Post" WHERE title='Khảo sát nhỏ' LIMIT 1),
  NOW() + INTERVAL '7 days'
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- POLL OPTION (FIXED)
--------------------------------------------------
INSERT INTO "PollOption" ("pollId","text")
VALUES
(
  (SELECT id FROM "Poll"
   WHERE "postId" = (SELECT id FROM "Post" WHERE title='Khảo sát nhỏ' LIMIT 1) LIMIT 1),
  'JavaScript'
),
(
  (SELECT id FROM "Poll"
   WHERE "postId" = (SELECT id FROM "Post" WHERE title='Khảo sát nhỏ' LIMIT 1) LIMIT 1),
  'Python'
),
(
  (SELECT id FROM "Poll"
   WHERE "postId" = (SELECT id FROM "Post" WHERE title='Khảo sát nhỏ' LIMIT 1) LIMIT 1),
  'Go'
);
 
 
--------------------------------------------------
-- POLL VOTE
--------------------------------------------------
INSERT INTO "PollVote" ("pollOptionId","userId","createdAt")
VALUES
(
  (SELECT id FROM "PollOption" WHERE text='JavaScript' LIMIT 1),
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  NOW()
),
(
  (SELECT id FROM "PollOption" WHERE text='Python' LIMIT 1),
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  NOW()
),
(
  (SELECT id FROM "PollOption" WHERE text='Python' LIMIT 1),
  (SELECT id FROM "User" WHERE email='c@gmail.com'),
  NOW()
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- COLLECTION & BOOKMARK
--------------------------------------------------
INSERT INTO "Collection" ("userId","name","createdAt")
VALUES
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  'Bài viết yêu thích',
  NOW()
);
 
INSERT INTO "Bookmark" ("userId","postId","collectionId","createdAt")
VALUES
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "Collection" WHERE name='Bài viết yêu thích' LIMIT 1),
  NOW()
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- XP LOG
--------------------------------------------------
INSERT INTO "XPLog" ("userId","action","value","createdAt")
VALUES
((SELECT id FROM "User" WHERE email='a@gmail.com'),'POST',50,NOW()),
((SELECT id FROM "User" WHERE email='a@gmail.com'),'COMMENT',10,NOW()),
((SELECT id FROM "User" WHERE email='b@gmail.com'),'LIKE_RECEIVED',5,NOW());
 
--------------------------------------------------
-- BADGE & USER BADGE
--------------------------------------------------
INSERT INTO "Badge" ("name","description")
VALUES ('Newbie','Người dùng mới'),('Active User','Hoạt động tích cực')
ON CONFLICT DO NOTHING;
 
INSERT INTO "UserBadge" ("userId","badgeId","earnedAt")
VALUES
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  (SELECT id FROM "Badge" WHERE name='Newbie'),
  NOW()
),
(
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  (SELECT id FROM "Badge" WHERE name='Active User'),
  NOW()
)
ON CONFLICT DO NOTHING;
 
--------------------------------------------------
-- NOTIFICATION
--------------------------------------------------
INSERT INTO "Notification"
("userId","type","refId","content","isRead","createdAt")
VALUES
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  'POST_LIKE',
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  'Bài viết của bạn vừa được thích',
  false,NOW()
),
(
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  'POST_COMMENT',
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  'Có người bình luận bài viết của bạn',
  false,NOW()
);
 
--------------------------------------------------
-- REPORT
--------------------------------------------------
INSERT INTO "Report"
("reporterId","postId","reason","status","createdAt")
VALUES
(
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  'Nội dung không phù hợp',
  'PENDING',
  NOW()
);
 
--------------------------------------------------
-- POST VIEW (tránh trùng unique)
--------------------------------------------------
INSERT INTO "PostView" ("postId","userId","viewedAt")
VALUES
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='a@gmail.com'),
  NOW()
),
(
  (SELECT id FROM "Post" WHERE title='Bài viết đầu tiên' LIMIT 1),
  (SELECT id FROM "User" WHERE email='b@gmail.com'),
  NOW() + INTERVAL '1 second'
);
 
COMMIT;