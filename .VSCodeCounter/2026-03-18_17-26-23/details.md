# Details

Date : 2026-03-18 17:26:23

Directory f:\\Coding\\MERN Stack\\Backend\\Websockets\\Chat App\\client

Total : 53 files,  10387 codes, 279 comments, 843 blanks, all 11509 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [client/README.md](/client/README.md) | Markdown | 9 | 0 | 8 | 17 |
| [client/eslint.config.js](/client/eslint.config.js) | JavaScript | 28 | 0 | 2 | 30 |
| [client/index.html](/client/index.html) | HTML | 14 | 0 | 1 | 15 |
| [client/package-lock.json](/client/package-lock.json) | JSON | 4,450 | 0 | 1 | 4,451 |
| [client/package.json](/client/package.json) | JSON | 39 | 0 | 1 | 40 |
| [client/postcss.config.js](/client/postcss.config.js) | JavaScript | 6 | 0 | 1 | 7 |
| [client/public/vite.svg](/client/public/vite.svg) | XML | 1 | 0 | 0 | 1 |
| [client/src/App.css](/client/src/App.css) | PostCSS | 0 | 0 | 1 | 1 |
| [client/src/App.jsx](/client/src/App.jsx) | JavaScript JSX | 47 | 2 | 9 | 58 |
| [client/src/api/chat.api.js](/client/src/api/chat.api.js) | JavaScript | 93 | 0 | 15 | 108 |
| [client/src/api/group.api.js](/client/src/api/group.api.js) | JavaScript | 182 | 3 | 28 | 213 |
| [client/src/api/message.api.js](/client/src/api/message.api.js) | JavaScript | 66 | 0 | 12 | 78 |
| [client/src/api/user.api.js](/client/src/api/user.api.js) | JavaScript | 159 | 1 | 16 | 176 |
| [client/src/assets/react.svg](/client/src/assets/react.svg) | XML | 1 | 0 | 0 | 1 |
| [client/src/components/guards/ProtectedRoute.jsx](/client/src/components/guards/ProtectedRoute.jsx) | JavaScript JSX | 12 | 0 | 7 | 19 |
| [client/src/components/guards/ProtectedRouteAuth.jsx](/client/src/components/guards/ProtectedRouteAuth.jsx) | JavaScript JSX | 12 | 0 | 5 | 17 |
| [client/src/components/message/FileUpload.jsx](/client/src/components/message/FileUpload.jsx) | JavaScript JSX | 94 | 0 | 12 | 106 |
| [client/src/components/message/MediaPreview.jsx](/client/src/components/message/MediaPreview.jsx) | JavaScript JSX | 194 | 9 | 19 | 222 |
| [client/src/components/message/Message.jsx](/client/src/components/message/Message.jsx) | JavaScript JSX | 535 | 32 | 49 | 616 |
| [client/src/components/message/SingleFilePreview.jsx](/client/src/components/message/SingleFilePreview.jsx) | JavaScript JSX | 100 | 6 | 13 | 119 |
| [client/src/components/user/ChatCard.jsx](/client/src/components/user/ChatCard.jsx) | JavaScript JSX | 178 | 20 | 15 | 213 |
| [client/src/components/user/ChatList.jsx](/client/src/components/user/ChatList.jsx) | JavaScript JSX | 118 | 4 | 14 | 136 |
| [client/src/components/user/ChatWindow.jsx](/client/src/components/user/ChatWindow.jsx) | JavaScript JSX | 161 | 8 | 20 | 189 |
| [client/src/components/user/CreateGroup.jsx](/client/src/components/user/CreateGroup.jsx) | JavaScript JSX | 87 | 0 | 13 | 100 |
| [client/src/components/user/GroupInfo.jsx](/client/src/components/user/GroupInfo.jsx) | JavaScript JSX | 612 | 76 | 76 | 764 |
| [client/src/components/user/Profile.jsx](/client/src/components/user/Profile.jsx) | JavaScript JSX | 407 | 16 | 36 | 459 |
| [client/src/components/user/Settings.jsx](/client/src/components/user/Settings.jsx) | JavaScript JSX | 32 | 0 | 7 | 39 |
| [client/src/constants/socketEvents.js](/client/src/constants/socketEvents.js) | JavaScript | 25 | 0 | 0 | 25 |
| [client/src/context/AuthProvider.jsx](/client/src/context/AuthProvider.jsx) | JavaScript JSX | 18 | 0 | 7 | 25 |
| [client/src/hooks/useGroup.jsx](/client/src/hooks/useGroup.jsx) | JavaScript JSX | 17 | 0 | 6 | 23 |
| [client/src/index.css](/client/src/index.css) | PostCSS | 8 | 0 | 1 | 9 |
| [client/src/main.jsx](/client/src/main.jsx) | JavaScript JSX | 17 | 0 | 3 | 20 |
| [client/src/pages/auth/Login.jsx](/client/src/pages/auth/Login.jsx) | JavaScript JSX | 93 | 14 | 17 | 124 |
| [client/src/pages/auth/Register.jsx](/client/src/pages/auth/Register.jsx) | JavaScript JSX | 153 | 12 | 19 | 184 |
| [client/src/pages/user/Chat.jsx](/client/src/pages/user/Chat.jsx) | JavaScript JSX | 601 | 23 | 73 | 697 |
| [client/src/pages/user/GroupInfoMain.jsx](/client/src/pages/user/GroupInfoMain.jsx) | JavaScript JSX | 541 | 14 | 70 | 625 |
| [client/src/pages/user/Home.jsx](/client/src/pages/user/Home.jsx) | JavaScript JSX | 485 | 14 | 56 | 555 |
| [client/src/pages/user/Sidebar.jsx](/client/src/pages/user/Sidebar.jsx) | JavaScript JSX | 245 | 9 | 53 | 307 |
| [client/src/services/getTime.js](/client/src/services/getTime.js) | JavaScript | 7 | 1 | 0 | 8 |
| [client/src/socket/handlers/chat.handler.js](/client/src/socket/handlers/chat.handler.js) | JavaScript | 13 | 0 | 5 | 18 |
| [client/src/socket/handlers/error.handler.js](/client/src/socket/handlers/error.handler.js) | JavaScript | 6 | 1 | 1 | 8 |
| [client/src/socket/handlers/group.handler.js](/client/src/socket/handlers/group.handler.js) | JavaScript | 19 | 0 | 8 | 27 |
| [client/src/socket/handlers/message.handler.js](/client/src/socket/handlers/message.handler.js) | JavaScript | 45 | 8 | 31 | 84 |
| [client/src/socket/handlers/onlineStatus.handler.js](/client/src/socket/handlers/onlineStatus.handler.js) | JavaScript | 19 | 3 | 3 | 25 |
| [client/src/socket/socket.js](/client/src/socket/socket.js) | JavaScript | 5 | 0 | 5 | 10 |
| [client/src/socket/socketListeners.js](/client/src/socket/socketListeners.js) | JavaScript | 23 | 0 | 14 | 37 |
| [client/src/store/useAssetsStore.js](/client/src/store/useAssetsStore.js) | JavaScript | 18 | 0 | 8 | 26 |
| [client/src/store/useChatStore.js](/client/src/store/useChatStore.js) | JavaScript | 289 | 0 | 57 | 346 |
| [client/src/store/useGroupChatStore.js](/client/src/store/useGroupChatStore.js) | JavaScript | 58 | 0 | 13 | 71 |
| [client/src/store/userStore.js](/client/src/store/userStore.js) | JavaScript | 25 | 1 | 10 | 36 |
| [client/tailwind.config.js](/client/tailwind.config.js) | JavaScript | 10 | 1 | 0 | 11 |
| [client/vercel.json](/client/vercel.json) | JSON | 5 | 0 | 0 | 5 |
| [client/vite.config.js](/client/vite.config.js) | JavaScript | 5 | 1 | 2 | 8 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)