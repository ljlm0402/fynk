"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FynkError = void 0;
exports.isFynkError = isFynkError;
class FynkError extends Error {
    constructor(message, options) {
        var _a, _b, _c;
        super(message);
        this.name = 'FynkError';
        this.config = options.config;
        this.response = options.response;
        this.status = (_a = options.response) === null || _a === void 0 ? void 0 : _a.status;
        this.headers = (_b = options.response) === null || _b === void 0 ? void 0 : _b.headers;
        this.data = (_c = options.response) === null || _c === void 0 ? void 0 : _c.data;
        this.cause = options.cause;
    }
}
exports.FynkError = FynkError;
function isFynkError(value) {
    return value instanceof FynkError;
}
