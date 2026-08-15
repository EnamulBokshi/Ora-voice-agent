import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { VoiceProxyGateway } from './ai-voice/voice-proxy.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile, etc.) and all merchant/subscriber storefront domains
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 ORA Server backend listening on http://localhost:${port}/api/v1`);

  // Attach the raw ws.Server for voice proxying AFTER NestJS has bound the HTTP server.
  // This intercepts WebSocket upgrade requests at /ws/voice without conflicting with
  // the existing Socket.IO or HTTP routes.
  const httpServer = app.getHttpServer();
  app.get(VoiceProxyGateway).attachToServer(httpServer);
  console.log(`🎙️  ORA Voice Proxy WebSocket listening at ws://localhost:${port}/ws/voice`);

}
bootstrap();
