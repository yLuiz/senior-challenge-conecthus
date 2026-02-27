import { Exclude } from 'class-transformer';

export class OutputUserHttpDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  password?: string;
}
