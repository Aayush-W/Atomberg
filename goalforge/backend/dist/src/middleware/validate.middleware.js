"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
function validate(schema, source = 'body') {
    return (req, _res, next) => {
        try {
            req[source] = schema.parse(req[source]);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next((0, errors_1.badRequest)('Validation failed', error.flatten()));
                return;
            }
            next(error);
        }
    };
}
