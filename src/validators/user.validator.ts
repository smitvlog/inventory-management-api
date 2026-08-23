import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    role: z.enum(['owner', 'manager', 'staff'], {
      required_error: 'Role is required (owner, manager, staff)'
    })
  })
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format')
  }),
  body: z.object({
    role: z.enum(['owner', 'manager', 'staff'], {
      required_error: 'Role is required (owner, manager, staff)'
    })
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format')
  })
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>['body'];
