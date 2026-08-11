export interface JwtPayloadUser {
    sub: string;
    businessId: string;
    email: string;
    role: string;
    sessionId: string;
}
export declare const CurrentUser: (...dataOrPipes: (keyof JwtPayloadUser | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
