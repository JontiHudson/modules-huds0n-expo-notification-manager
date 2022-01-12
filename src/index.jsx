"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationManager = void 0;
const NotificationStateClass_1 = require("./NotificationStateClass");
function createNotificationManager(options) {
    return new NotificationStateClass_1.NotificationStateClass(options);
}
exports.createNotificationManager = createNotificationManager;
