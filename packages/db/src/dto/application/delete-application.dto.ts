import { IsUUID } from 'class-validator';

export class DeleteApplicationDto {
  @IsUUID()
  id: string;
}
