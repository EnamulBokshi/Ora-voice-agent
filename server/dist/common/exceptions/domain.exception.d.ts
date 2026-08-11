import { HttpException, HttpStatus } from '@nestjs/common';
export declare class DomainException extends HttpException {
    readonly code: string;
    constructor(code: string, message: string, status?: HttpStatus);
}
