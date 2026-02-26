import { User } from '@prisma/client';

export interface OutputUserHttpDto extends Omit<User, 'password'> { }