import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { authHandler } from './config/auth.js';
import { buildOpenApiDoc } from './config/openapi.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes/index.js';

export const app = express();

// Thứ tự mount ở đây rất quan trọng — xem convention.md §4.2.
// Auth.js cần đọc body dạng form-urlencoded và phải được mount TRƯỚC express.json(),
// nếu không express.json() nuốt mất body và authorize() nhận undefined.
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authHandler);

app.use(express.json());
app.use('/api/v1', apiRouter);

// Tài liệu API. Phải đứng SAU dòng mount apiRouter: khi đó mọi file routes đã
// được import và registry mới có đủ path để sinh tài liệu.
const openApiDoc = buildOpenApiDoc();
app.get('/docs.json', (_req, res) => res.json(openApiDoc));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

app.use(notFoundHandler);
app.use(errorHandler);
