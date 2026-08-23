import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { loginSchema } from './auth.schemas';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), controller.login);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', authenticate, controller.me);
