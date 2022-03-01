import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'http';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatsService } from './chats.service';
import {
  CreateChatDto,
  getSocketTypeKey,
  OnLineDoctor,
} from './dto/create-chat.dto';

@WebSocketGateway()
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // private static onLineDoctors: OnLineDoctor[] = [];
  private static onLineDoctors: Map<string, OnLineDoctor> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatsService: ChatsService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(socket: Socket): void {
    const socketId = socket.id;
    console.log(`New connecting... socket id:`, socketId);
    // ChatWebsocketGateway.participants.set(socketId, '');
  }

  handleDisconnect(socket: Socket): void {
    const socketId = socket.id;
    console.log(`Disconnection... socket id:`, socketId);
    ChatsGateway.onLineDoctors.delete(socketId);
  }

  // 获取在线的医生
  @SubscribeMessage('load_online_doctors')
  loadOneLineDoctors() {
    // 获取在线的医生列表
    // 查询数据库，获取在线的医生信息
    const doctorIds = [];
    ChatsGateway.onLineDoctors.forEach((item) => doctorIds.push(item.doctorId));
    return this.prisma.doctor.findMany({
      where: {
        id: {
          in: doctorIds,
        },
      },
    });
  }

  // 医生上线
  @SubscribeMessage('to_work')
  toWork(socket: Socket, @MessageBody() createChatDto: CreateChatDto) {
    //
    console.log('医生上线, socketId: %s, info: %s', socket.id, createChatDto);
    ChatsGateway.onLineDoctors.set(socket.id, {
      socketId: socket.id,
      doctorId: createChatDto.doctor,
    });
  }

  // 提问，从用户发给医生
  @SubscribeMessage('ask')
  async ask(@MessageBody() createChatDto: CreateChatDto) {
    // 提问了，把问题转移给对应的医生
    const from = await this.prisma.user.findFirst({
      where: { id: createChatDto.user },
    });
    const to = await this.prisma.doctor.findFirst({
      where: { id: createChatDto.doctor },
    });
    this.server.emit('ask/' + getSocketTypeKey(createChatDto), {
      from: from.nickName ? from.nickName : from.userName,
      to: to.name,
      content: createChatDto.content,
      date: Date.now(),
    });
    // 如果需要，可以存储聊天内容
    return { code: 1, data: '提问完成' };
  }

  // 回复，从医生发给用户
  @SubscribeMessage('reply')
  async reply(@MessageBody() createChatDto: CreateChatDto) {
    const to = await this.prisma.user.findFirst({
      where: { id: createChatDto.user },
    });
    const from = await this.prisma.doctor.findFirst({
      where: { id: createChatDto.doctor },
    });
    this.server.emit('reply/' + getSocketTypeKey(createChatDto), {
      from: from.name,
      to: to.nickName ? to.nickName : to.userName,
      content: createChatDto.content,
      date: Date.now(),
    });
    return { code: 1, data: '回答完成' };
  }
}
