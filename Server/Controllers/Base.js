export class BaseController {
  static success(data, message = '操作成功') {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message = '操作失败', code = 400) {
    return {
      success: false,
      message,
      code,
    };
  }
}


