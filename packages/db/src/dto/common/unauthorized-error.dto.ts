export class UnauthorizedErrorDto {
  statusCode: 401;
  message: string | string[];
  error: 'Unauthorized';
}
