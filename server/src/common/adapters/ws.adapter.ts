import { IoAdapter } from '@nestjs/platform-socket.io';

export class WsAdapter extends IoAdapter {
  constructor(private readonly frontendUrl: string) {
    super();
  }

  create(port: number, options?: any) {
    return super.create(port, {
      ...options,
      cors: {
        origin: this.frontendUrl,
        credentials: true,
      },
    });
  }
}
