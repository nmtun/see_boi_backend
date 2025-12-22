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
}
