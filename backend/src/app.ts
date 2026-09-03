import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes/index.js';

export const app = express();

// Thứ tự mount ở đây rất quan trọng — xem convention.md §4.2.
// Auth.js cần đọc body dạng form-urlencoded và phải được mount TRƯỚC express.json(),
// nếu không express.json() nuốt mất body và authorize() nhận undefined.
app.use(express.urlencoded({ extended: true }));

// app.use('/auth', authHandler);   // US-00.3 — Auth.js

app.use(express.json());
app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
