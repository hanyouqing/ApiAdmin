import Koa from 'koa';

export class BaseController {
  static success(data: any, message: string = '操作成功') {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message: string = '操作失败', code: number = 400) {
    return {
      success: false,
      message,
      code,
    };
  }
}
