import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { VoiceProxyGateway } from './ai-voice/voice-proxy.gateway';

// ORA Main Entry Point - Auth Forgot/Reset Enabled
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

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

  // Origins stay open because the storefront widget is loaded from arbitrary
  // merchant domains and calls this API cross-origin (voice session bootstrap,
  // ingestion telemetry) using the `x-publishable-key` header.
  //
  // `credentials` is deliberately false. Nothing in the system needs
  // credentialed cross-origin requests: the widget never sets `credentials`,
  // and the ORA dashboard and the Shopify embedded app are both served from
  // this API's own origin through nginx (`/api/` and `/`, `/shopify`), so their
  // calls are same-origin and carry cookies without CORS being involved.
  //
  // Reflecting an arbitrary origin *with* credentials, which this used to do,
  // let any website make cookie-bearing calls to this API on a signed-in
  // user's behalf. Never set both to permissive values at once.
  app.enableCors({
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-publishable-key', 'X-Publishable-Key', 'x-api-key', 'X-API-Key'],
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 ORA Server backend listening on http://0.0.0.0:${port}/api/v1`);

  // Attach the raw ws.Server for voice proxying AFTER NestJS has bound the HTTP server.
  // This intercepts WebSocket upgrade requests at /ws/voice without conflicting with
  // the existing Socket.IO or HTTP routes.
  const httpServer = app.getHttpServer();
  app.get(VoiceProxyGateway).attachToServer(httpServer);
  console.log(`🎙️  ORA Voice Proxy WebSocket listening at ws://localhost:${port}/ws/voice`);

}
bootstrap();
