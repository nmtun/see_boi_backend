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

  sendNotification(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('notification', data);
  }

  sendComment(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('comment', data);
  }

  sendLike(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('like', data);
  }
}