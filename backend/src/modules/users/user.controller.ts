import type { Request, Response } from 'express';
import { ok } from '../../types/response.js';
import { currentUser, param } from '../../utils/request.js';
import {
  userListQuerySchema,
  type CreateManagerInput,
  type ImportStudentsInput,
  type StudentAccountInput,
  type UpdateUserInput,
} from './user.schema.js';
import * as userService from './user.service.js';

/** GET /api/v1/users */
export async function list(req: Request, res: Response) {
  const { data, meta } = await userService.list(userListQuerySchema.parse(req.query));
  res.json(ok(data, meta));
}

/** POST /api/v1/users */
export async function createManager(req: Request, res: Response) {
  res.status(201).json(ok(await userService.createManager(req.body as CreateManagerInput)));
}

/** POST /api/v1/users/students */
export async function createStudent(req: Request, res: Response) {
  res.status(201).json(ok(await userService.createStudent(req.body as StudentAccountInput)));
}

/** POST /api/v1/users/students/import */
export async function importStudents(req: Request, res: Response) {
  res.json(ok(await userService.importStudents(req.body as ImportStudentsInput)));
}

/** POST /api/v1/users/:id/reset-password */
export async function resetPassword(req: Request, res: Response) {
  res.json(ok(await userService.resetStudentPassword(param(req))));
}

/** DELETE /api/v1/users/:id */
export async function remove(req: Request, res: Response) {
  res.json(ok(await userService.remove(currentUser(req), param(req))));
}

/** PATCH /api/v1/users/:id */
export async function update(req: Request, res: Response) {
  res.json(ok(await userService.update(currentUser(req), param(req), req.body as UpdateUserInput)));
}
