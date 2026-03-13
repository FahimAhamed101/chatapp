# Chat System Export

This folder contains the chat system extracted from the WellByn backend. It includes the REST API (routes, controller, service, repository), Mongoose models, validators, and socket emitter used for real-time updates.

## Included Files
- `src/app.ts`
- `src/server.ts`
- `src/interfaces/chat.interface.ts`
- `src/interfaces/doctor.interface.ts`
- `src/interfaces/user.interface.ts`
- `src/models/chat-conversation.model.ts`
- `src/models/chat-message.model.ts`
- `src/models/doctor.model.ts`
- `src/models/user.model.ts`
- `src/repositories/chat.repository.ts`
- `src/repositories/doctor.repository.ts`
- `src/repositories/user.repository.ts`
- `src/services/chat.service.ts`
- `src/controllers/chat.controller.ts`
- `src/routes/chat.routes.ts`
- `src/validators/chat.validator.ts`
- `src/middlewares/auth.middleware.ts`
- `src/middlewares/validate.middleware.ts`
- `src/middlewares/error.middleware.ts`
- `src/utils/appError.ts`
- `src/utils/uploadPath.ts`
- `src/socket.ts`
- `src/config/db.ts`
- `package.json`
- `tsconfig.json`
- `.env.example`

## REST API Endpoints
These routes are mounted in the original app under `app.use("/api/chat", chatRoutes)`.

- `POST /api/chat/conversations`
  - For users: `{ "senderId": "..." }`
  - For senders: `{ "userId": "..." }`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId/messages?limit=20&before=ISODate`
- `POST /api/chat/conversations/:conversationId/messages`
  - Body: `{ "content": "..." }`
- `POST /api/chat/conversations/:conversationId/read`

All routes require `Authorization: Bearer <token>` and roles `user` or `sender`.

## Socket Events
`src/socket.ts` maintains a userId -> socketId map and lets the service emit:
- `chat:message`
- `chat:read`

Socket authentication uses a JWT passed via `token` header or `Authorization: Bearer <token>` and expects `ACCESS_TOKEN_SECRET`.

## Run Locally
1. `cd export/chat-system`
2. `npm install`
3. Create `.env` (use `.env.example` as a template)
4. `npm run dev`

## Dependencies To Wire
This export keeps the original imports and expects these to exist in your host project:
- MongoDB connection and app bootstrap
- Node deps used by the copied models: `bcryptjs`, `jsonwebtoken`, `axios`

If you want me to make this export fully standalone by trimming `socket.ts` to chat-only and/or copying additional dependencies, tell me.
