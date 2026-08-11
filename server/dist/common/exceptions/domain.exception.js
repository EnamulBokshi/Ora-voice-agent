"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainException = void 0;
const common_1 = require("@nestjs/common");
class DomainException extends common_1.HttpException {
    code;
    constructor(code, message, status = common_1.HttpStatus.BAD_REQUEST) {
        super({
            code,
            message,
        }, status);
        this.code = code;
    }
}
exports.DomainException = DomainException;
//# sourceMappingURL=domain.exception.js.map