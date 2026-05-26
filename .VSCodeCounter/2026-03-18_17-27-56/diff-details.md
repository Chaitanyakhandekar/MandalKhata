# Diff Details

Date : 2026-03-18 17:27:56

Directory f:\\Coding\\MERN Stack\\Backend\\Websockets\\Chat App\\server

Total : 116 files,  -4779 codes, -106 comments, -69 blanks, all -4954 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [client/README.md](/client/README.md) | Markdown | -9 | 0 | -8 | -17 |
| [client/eslint.config.js](/client/eslint.config.js) | JavaScript | -28 | 0 | -2 | -30 |
| [client/index.html](/client/index.html) | HTML | -14 | 0 | -1 | -15 |
| [client/package-lock.json](/client/package-lock.json) | JSON | -4,450 | 0 | -1 | -4,451 |
| [client/package.json](/client/package.json) | JSON | -39 | 0 | -1 | -40 |
| [client/postcss.config.js](/client/postcss.config.js) | JavaScript | -6 | 0 | -1 | -7 |
| [client/public/vite.svg](/client/public/vite.svg) | XML | -1 | 0 | 0 | -1 |
| [client/src/App.css](/client/src/App.css) | PostCSS | 0 | 0 | -1 | -1 |
| [client/src/App.jsx](/client/src/App.jsx) | JavaScript JSX | -47 | -2 | -9 | -58 |
| [client/src/api/chat.api.js](/client/src/api/chat.api.js) | JavaScript | -93 | 0 | -15 | -108 |
| [client/src/api/group.api.js](/client/src/api/group.api.js) | JavaScript | -182 | -3 | -28 | -213 |
| [client/src/api/message.api.js](/client/src/api/message.api.js) | JavaScript | -66 | 0 | -12 | -78 |
| [client/src/api/user.api.js](/client/src/api/user.api.js) | JavaScript | -159 | -1 | -16 | -176 |
| [client/src/assets/react.svg](/client/src/assets/react.svg) | XML | -1 | 0 | 0 | -1 |
| [client/src/components/guards/ProtectedRoute.jsx](/client/src/components/guards/ProtectedRoute.jsx) | JavaScript JSX | -12 | 0 | -7 | -19 |
| [client/src/components/guards/ProtectedRouteAuth.jsx](/client/src/components/guards/ProtectedRouteAuth.jsx) | JavaScript JSX | -12 | 0 | -5 | -17 |
| [client/src/components/message/FileUpload.jsx](/client/src/components/message/FileUpload.jsx) | JavaScript JSX | -94 | 0 | -12 | -106 |
| [client/src/components/message/MediaPreview.jsx](/client/src/components/message/MediaPreview.jsx) | JavaScript JSX | -194 | -9 | -19 | -222 |
| [client/src/components/message/Message.jsx](/client/src/components/message/Message.jsx) | JavaScript JSX | -535 | -32 | -49 | -616 |
| [client/src/components/message/SingleFilePreview.jsx](/client/src/components/message/SingleFilePreview.jsx) | JavaScript JSX | -100 | -6 | -13 | -119 |
| [client/src/components/user/ChatCard.jsx](/client/src/components/user/ChatCard.jsx) | JavaScript JSX | -178 | -20 | -15 | -213 |
| [client/src/components/user/ChatList.jsx](/client/src/components/user/ChatList.jsx) | JavaScript JSX | -118 | -4 | -14 | -136 |
| [client/src/components/user/ChatWindow.jsx](/client/src/components/user/ChatWindow.jsx) | JavaScript JSX | -161 | -8 | -20 | -189 |
| [client/src/components/user/CreateGroup.jsx](/client/src/components/user/CreateGroup.jsx) | JavaScript JSX | -87 | 0 | -13 | -100 |
| [client/src/components/user/GroupInfo.jsx](/client/src/components/user/GroupInfo.jsx) | JavaScript JSX | -612 | -76 | -76 | -764 |
| [client/src/components/user/Profile.jsx](/client/src/components/user/Profile.jsx) | JavaScript JSX | -407 | -16 | -36 | -459 |
| [client/src/components/user/Settings.jsx](/client/src/components/user/Settings.jsx) | JavaScript JSX | -32 | 0 | -7 | -39 |
| [client/src/constants/socketEvents.js](/client/src/constants/socketEvents.js) | JavaScript | -25 | 0 | 0 | -25 |
| [client/src/context/AuthProvider.jsx](/client/src/context/AuthProvider.jsx) | JavaScript JSX | -18 | 0 | -7 | -25 |
| [client/src/hooks/useGroup.jsx](/client/src/hooks/useGroup.jsx) | JavaScript JSX | -17 | 0 | -6 | -23 |
| [client/src/index.css](/client/src/index.css) | PostCSS | -8 | 0 | -1 | -9 |
| [client/src/main.jsx](/client/src/main.jsx) | JavaScript JSX | -17 | 0 | -3 | -20 |
| [client/src/pages/auth/Login.jsx](/client/src/pages/auth/Login.jsx) | JavaScript JSX | -93 | -14 | -17 | -124 |
| [client/src/pages/auth/Register.jsx](/client/src/pages/auth/Register.jsx) | JavaScript JSX | -153 | -12 | -19 | -184 |
| [client/src/pages/user/Chat.jsx](/client/src/pages/user/Chat.jsx) | JavaScript JSX | -601 | -23 | -73 | -697 |
| [client/src/pages/user/GroupInfoMain.jsx](/client/src/pages/user/GroupInfoMain.jsx) | JavaScript JSX | -541 | -14 | -70 | -625 |
| [client/src/pages/user/Home.jsx](/client/src/pages/user/Home.jsx) | JavaScript JSX | -485 | -14 | -56 | -555 |
| [client/src/pages/user/Sidebar.jsx](/client/src/pages/user/Sidebar.jsx) | JavaScript JSX | -245 | -9 | -53 | -307 |
| [client/src/services/getTime.js](/client/src/services/getTime.js) | JavaScript | -7 | -1 | 0 | -8 |
| [client/src/socket/handlers/chat.handler.js](/client/src/socket/handlers/chat.handler.js) | JavaScript | -13 | 0 | -5 | -18 |
| [client/src/socket/handlers/error.handler.js](/client/src/socket/handlers/error.handler.js) | JavaScript | -6 | -1 | -1 | -8 |
| [client/src/socket/handlers/group.handler.js](/client/src/socket/handlers/group.handler.js) | JavaScript | -19 | 0 | -8 | -27 |
| [client/src/socket/handlers/message.handler.js](/client/src/socket/handlers/message.handler.js) | JavaScript | -45 | -8 | -31 | -84 |
| [client/src/socket/handlers/onlineStatus.handler.js](/client/src/socket/handlers/onlineStatus.handler.js) | JavaScript | -19 | -3 | -3 | -25 |
| [client/src/socket/socket.js](/client/src/socket/socket.js) | JavaScript | -5 | 0 | -5 | -10 |
| [client/src/socket/socketListeners.js](/client/src/socket/socketListeners.js) | JavaScript | -23 | 0 | -14 | -37 |
| [client/src/store/useAssetsStore.js](/client/src/store/useAssetsStore.js) | JavaScript | -18 | 0 | -8 | -26 |
| [client/src/store/useChatStore.js](/client/src/store/useChatStore.js) | JavaScript | -289 | 0 | -57 | -346 |
| [client/src/store/useGroupChatStore.js](/client/src/store/useGroupChatStore.js) | JavaScript | -58 | 0 | -13 | -71 |
| [client/src/store/userStore.js](/client/src/store/userStore.js) | JavaScript | -25 | -1 | -10 | -36 |
| [client/tailwind.config.js](/client/tailwind.config.js) | JavaScript | -10 | -1 | 0 | -11 |
| [client/vercel.json](/client/vercel.json) | JSON | -5 | 0 | 0 | -5 |
| [client/vite.config.js](/client/vite.config.js) | JavaScript | -5 | -1 | -2 | -8 |
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

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details