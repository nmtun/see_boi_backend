import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client phải gọi socket.emit('join', userId) sau khi kết nối
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
    client.join(`user_${userId}`);
    this.logger.log(`User ${userId} joined room user_${userId}`);
  }

  // Join post room - Frontend emit khi vào trang post detail
  @SubscribeMessage('joinPost')
  handleJoinPost(
    @MessageBody() postId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`post-${postId}`);
    this.logger.log(`Client ${client.id} joined post room: post-${postId}`);
  }

  // Leave post room - Frontend emit khi rời trang post detail
  @SubscribeMessage('leavePost')
  handleLeavePost(
    @MessageBody() postId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`post-${postId}`);
    this.logger.log(`Client ${client.id} left post room: post-${postId}`);
  }

  // User notifications (existing)
  sendNotification(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('notification', data);
  }

  sendComment(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('comment', data);
  }

  sendLike(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('like', data);
  }

  // Real-time comment events for post rooms
  emitNewComment(postId: number, comment: any) {
    this.server.to(`post-${postId}`).emit('newComment', comment);
    this.logger.log(`New comment emitted to post-${postId}`);
  }

  emitUpdateComment(postId: number, comment: any) {
    this.server.to(`post-${postId}`).emit('updateComment', comment);
    this.logger.log(`Update comment emitted to post-${postId}`);
  }

  emitDeleteComment(postId: number, commentId: number) {
    this.server.to(`post-${postId}`).emit('deleteComment', commentId);
    this.logger.log(`Delete comment ${commentId} emitted to post-${postId}`);
  }

  // Admin actions notifications
  emitAdminDeletePost(userId: number, postTitle: string) {
    const notification = {
      type: 'ADMIN_DELETE_POST',
      message: `Bài viết "${postTitle}" của bạn đã bị quản trị viên xóa`,
      timestamp: new Date(),
    };
    this.server.to(`user_${userId}`).emit('adminAction', notification);
    this.logger.log(`Admin delete post notification sent to user ${userId}`);
  }

  emitAdminHidePost(userId: number, postTitle: string, isVisible: boolean) {
    const notification = {
      type: isVisible ? 'ADMIN_SHOW_POST' : 'ADMIN_HIDE_POST',
      message: isVisible 
        ? `Bài viết "${postTitle}" của bạn đã được hiển thị trở lại`
        : `Bài viết "${postTitle}" của bạn đã bị ẩn bởi quản trị viên`,
      timestamp: new Date(),
    };
    this.server.to(`user_${userId}`).emit('adminAction', notification);
    this.logger.log(`Admin ${isVisible ? 'show' : 'hide'} post notification sent to user ${userId}`);
  }

  emitAdminDeleteComment(userId: number, postTitle: string) {
    const notification = {
      type: 'ADMIN_DELETE_COMMENT',
      message: `Comment của bạn trong bài viết "${postTitle}" đã bị quản trị viên xóa`,
      timestamp: new Date(),
    };
    this.server.to(`user_${userId}`).emit('adminAction', notification);
    this.logger.log(`Admin delete comment notification sent to user ${userId}`);
  }

  emitAdminHideComment(userId: number, postTitle: string, isVisible: boolean) {
    const notification = {
      type: isVisible ? 'ADMIN_SHOW_COMMENT' : 'ADMIN_HIDE_COMMENT',
      message: isVisible
        ? `Comment của bạn trong bài viết "${postTitle}" đã được hiển thị trở lại`
        : `Comment của bạn trong bài viết "${postTitle}" đã bị ẩn bởi quản trị viên`,
      timestamp: new Date(),
    };
    this.server.to(`user_${userId}`).emit('adminAction', notification);
    this.logger.log(`Admin ${isVisible ? 'show' : 'hide'} comment notification sent to user ${userId}`);
  }

  // Report resolution notifications
  emitReportResolved(reporterId: number, action: string, contentType: 'post' | 'comment') {
    const notification = {
      type: 'REPORT_RESOLVED',
      message: `Báo cáo của bạn về ${contentType === 'post' ? 'bài viết' : 'comment'} đã được xử lý: ${action}`,
      timestamp: new Date(),
    };
    this.server.to(`user_${reporterId}`).emit('reportAction', notification);
    this.logger.log(`Report resolved notification sent to reporter ${reporterId}`);
  }

  emitReportedContentDeleted(authorId: number, contentType: 'post' | 'comment', contentTitle: string, reason: string) {
    const notification = {
      type: contentType === 'post' ? 'REPORTED_POST_DELETED' : 'REPORTED_COMMENT_DELETED',
      message: `${contentType === 'post' ? 'Bài viết' : 'Comment'} "${contentTitle}" của bạn đã bị xóa do vi phạm quy định. Lý do: ${reason}`,
      timestamp: new Date(),
    };
    this.server.to(`user_${authorId}`).emit('adminAction', notification);
    this.logger.log(`Content deleted notification sent to author ${authorId}`);
  }

  emitReportWarning(authorId: number, contentType: 'post' | 'comment', contentTitle: string, reason: string) {
    const notification = {
      type: 'REPORT_WARNING',
      message: `${contentType === 'post' ? 'Bài viết' : 'Comment'} "${contentTitle}" của bạn đã nhận cảnh cáo từ quản trị viên. Lý do: ${reason}`,
      timestamp: new Date(),
    };
    this.server.to(`user_${authorId}`).emit('adminAction', notification);
    this.logger.log(`Warning notification sent to author ${authorId}`);
  }
}
