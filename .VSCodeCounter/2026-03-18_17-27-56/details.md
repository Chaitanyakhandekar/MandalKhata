# Details

Date : 2026-03-18 17:27:56

Directory f:\\Coding\\MERN Stack\\Backend\\Websockets\\Chat App\\server

Total : 63 files,  5608 codes, 173 comments, 774 blanks, all 6555 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [server/package-lock.json](/server/package-lock.json) | JSON | 2,616 | 0 | 1 | 2,617 |
| [server/package.json](/server/package.json) | JSON | 37 | 0 | 1 | 38 |
| [server/src/constants/socketEvents.js](/server/src/constants/socketEvents.js) | JavaScript | 25 | 0 | 1 | 26 |
| [server/src/controllers/chat.controller.js](/server/src/controllers/chat.controller.js) | JavaScript | 321 | 2 | 64 | 387 |
| [server/src/controllers/group.controller.js](/server/src/controllers/group.controller.js) | JavaScript | 223 | 18 | 65 | 306 |
| [server/src/controllers/message.controller.js](/server/src/controllers/message.controller.js) | JavaScript | 115 | 0 | 35 | 150 |
| [server/src/controllers/user.controller.js](/server/src/controllers/user.controller.js) | JavaScript | 731 | 31 | 171 | 933 |
| [server/src/db/db.js](/server/src/db/db.js) | JavaScript | 14 | 0 | 3 | 17 |
| [server/src/index.js](/server/src/index.js) | JavaScript | 10 | 0 | 3 | 13 |
| [server/src/middlewares/adminPermission.middleware.js](/server/src/middlewares/adminPermission.middleware.js) | JavaScript | 21 | 0 | 6 | 27 |
| [server/src/middlewares/draftImage.middleware.js](/server/src/middlewares/draftImage.middleware.js) | JavaScript | 15 | 0 | 2 | 17 |
| [server/src/middlewares/draftOwner.middleware.js](/server/src/middlewares/draftOwner.middleware.js) | JavaScript | 23 | 0 | 8 | 31 |
| [server/src/middlewares/multer.middleware.js](/server/src/middlewares/multer.middleware.js) | JavaScript | 10 | 0 | 2 | 12 |
| [server/src/middlewares/publicProfile.middleware.js](/server/src/middlewares/publicProfile.middleware.js) | JavaScript | 20 | 0 | 8 | 28 |
| [server/src/middlewares/userAuth.middleware.js](/server/src/middlewares/userAuth.middleware.js) | JavaScript | 35 | 2 | 12 | 49 |
| [server/src/models/chat.model.js](/server/src/models/chat.model.js) | JavaScript | 43 | 0 | 16 | 59 |
| [server/src/models/message.model.js](/server/src/models/message.model.js) | JavaScript | 79 | 1 | 8 | 88 |
| [server/src/models/user.model.js](/server/src/models/user.model.js) | JavaScript | 73 | 0 | 10 | 83 |
| [server/src/redis/config.js](/server/src/redis/config.js) | JavaScript | 6 | 2 | 3 | 11 |
| [server/src/routes/chat.route.js](/server/src/routes/chat.route.js) | JavaScript | 18 | 2 | 2 | 22 |
| [server/src/routes/group.route.js](/server/src/routes/group.route.js) | JavaScript | 24 | 0 | 4 | 28 |
| [server/src/routes/message.route.js](/server/src/routes/message.route.js) | JavaScript | 11 | 2 | 2 | 15 |
| [server/src/routes/ping.route.js](/server/src/routes/ping.route.js) | JavaScript | 7 | 0 | 3 | 10 |
| [server/src/routes/user.route.js](/server/src/routes/user.route.js) | JavaScript | 47 | 0 | 4 | 51 |
| [server/src/server.js](/server/src/server.js) | JavaScript | 34 | 5 | 15 | 54 |
| [server/src/services/brevoMail.service.js](/server/src/services/brevoMail.service.js) | JavaScript | 21 | 6 | 8 | 35 |
| [server/src/services/cloudinary.service.js](/server/src/services/cloudinary.service.js) | JavaScript | 44 | 8 | 15 | 67 |
| [server/src/services/generateOTP.js](/server/src/services/generateOTP.js) | JavaScript | 5 | 0 | 1 | 6 |
| [server/src/services/generateTokens.js](/server/src/services/generateTokens.js) | JavaScript | 6 | 0 | 2 | 8 |
| [server/src/services/group.service.js](/server/src/services/group.service.js) | JavaScript | 78 | 22 | 33 | 133 |
| [server/src/services/mail.service.js](/server/src/services/mail.service.js) | JavaScript | 35 | 0 | 7 | 42 |
| [server/src/services/mailSender.service.js](/server/src/services/mailSender.service.js) | JavaScript | 21 | 0 | 7 | 28 |
| [server/src/services/sendOTP.js](/server/src/services/sendOTP.js) | JavaScript | 20 | 0 | 4 | 24 |
| [server/src/services/sendVerificationToken.js](/server/src/services/sendVerificationToken.js) | JavaScript | 128 | 0 | 14 | 142 |
| [server/src/sockets/handler/chat.handler.js](/server/src/sockets/handler/chat.handler.js) | JavaScript | 7 | 1 | 4 | 12 |
| [server/src/sockets/handler/disconnect.handler.js](/server/src/sockets/handler/disconnect.handler.js) | JavaScript | 23 | 0 | 8 | 31 |
| [server/src/sockets/handler/group.handler.js](/server/src/sockets/handler/group.handler.js) | JavaScript | 13 | 40 | 16 | 69 |
| [server/src/sockets/handler/index.js](/server/src/sockets/handler/index.js) | JavaScript | 15 | 0 | 4 | 19 |
| [server/src/sockets/handler/message.handler.js](/server/src/sockets/handler/message.handler.js) | JavaScript | 188 | 1 | 54 | 243 |
| [server/src/sockets/handler/onlineStatus.handler.js](/server/src/sockets/handler/onlineStatus.handler.js) | JavaScript | 29 | 2 | 10 | 41 |
| [server/src/sockets/handler/onlineStatusAfterLogin.js](/server/src/sockets/handler/onlineStatusAfterLogin.js) | JavaScript | 50 | 2 | 12 | 64 |
| [server/src/sockets/index.js](/server/src/sockets/index.js) | JavaScript | 28 | 3 | 17 | 48 |
| [server/src/sockets/middleware/adminPermission.middleware.js](/server/src/sockets/middleware/adminPermission.middleware.js) | JavaScript | 23 | 0 | 7 | 30 |
| [server/src/sockets/middleware/auth.middleware.js](/server/src/sockets/middleware/auth.middleware.js) | JavaScript | 27 | 2 | 11 | 40 |
| [server/src/sockets/socketInstance.js](/server/src/sockets/socketInstance.js) | JavaScript | 10 | 0 | 2 | 12 |
| [server/src/sockets/soketsMap.js](/server/src/sockets/soketsMap.js) | JavaScript | 10 | 0 | 3 | 13 |
| [server/src/sockets/utils/cookieParser.js](/server/src/sockets/utils/cookieParser.js) | JavaScript | 11 | 0 | 1 | 12 |
| [server/src/sockets/utils/getGroupMembers.js](/server/src/sockets/utils/getGroupMembers.js) | JavaScript | 19 | 1 | 9 | 29 |
| [server/src/sockets/utils/getOtherChatUser.js](/server/src/sockets/utils/getOtherChatUser.js) | JavaScript | 13 | 0 | 6 | 19 |
| [server/src/sockets/utils/getUserChatPartners.js](/server/src/sockets/utils/getUserChatPartners.js) | JavaScript | 18 | 0 | 7 | 25 |
| [server/src/utils/apiUtils.js](/server/src/utils/apiUtils.js) | JavaScript | 25 | 0 | 5 | 30 |
| [server/src/utils/asyncHandler.js](/server/src/utils/asyncHandler.js) | JavaScript | 10 | 0 | 2 | 12 |
| [server/src/utils/document existance check/chat.js](/server/src/utils/document%20existance%20check/chat.js) | JavaScript | 13 | 0 | 5 | 18 |
| [server/src/utils/document existance check/group.js](/server/src/utils/document%20existance%20check/group.js) | JavaScript | 3 | 5 | 2 | 10 |
| [server/src/utils/document existance check/message.js](/server/src/utils/document%20existance%20check/message.js) | JavaScript | 0 | 0 | 1 | 1 |
| [server/src/utils/document existance check/user.js](/server/src/utils/document%20existance%20check/user.js) | JavaScript | 12 | 0 | 6 | 18 |
| [server/src/utils/fields validations/assertAtleastOneField.js](/server/src/utils/fields%20validations/assertAtleastOneField.js) | JavaScript | 10 | 0 | 2 | 12 |
| [server/src/utils/fields validations/assertRequiredFields.js](/server/src/utils/fields%20validations/assertRequiredFields.js) | JavaScript | 13 | 0 | 9 | 22 |
| [server/src/utils/fields validations/validateAtleastOneField.js](/server/src/utils/fields%20validations/validateAtleastOneField.js) | JavaScript | 10 | 0 | 2 | 12 |
| [server/src/utils/fields validations/validateRequiredFields.js](/server/src/utils/fields%20validations/validateRequiredFields.js) | JavaScript | 15 | 4 | 8 | 27 |
| [server/src/utils/getUniqueMembers.js](/server/src/utils/getUniqueMembers.js) | JavaScript | 13 | 11 | 8 | 32 |
| [server/src/utils/isValidObjectId.js](/server/src/utils/isValidObjectId.js) | JavaScript | 7 | 0 | 4 | 11 |
| [server/src/utils/verify-success.html](/server/src/utils/verify-success.html) | HTML | 77 | 0 | 9 | 86 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)