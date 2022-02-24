import { Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/admin/users/dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { encodePwd } from 'src/utils/tools';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   *  根据名字获取数据
   * @param userName
   * @returns
   */
  async userByUserName(userName: string) {
    return this.prisma.user.findUnique({ where: { userName } });
  }

  /**
   * 用户注册
   * @param user
   * @returns
   */
  async userReg(user: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        ...user,
        password: encodePwd(user.password),
      },
    });
  }

  /**
   * 登录
   * @param userName
   * @param password
   * @returns
   */
  async userLogin(userName: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { userName } });
    if (user) {
      const pwd = encodePwd(password);
      if (pwd == user.password) {
        return {
          success: true,
          errorMessage: '登陆成功',
          data: user.id,
        };
      }
      return {
        success: false,
        errorMessage: '密码错误',
        data: '',
      };
    }
    return {
      success: false,
      errorMessage: '用户信息不存在',
      data: '',
    };
  }
}