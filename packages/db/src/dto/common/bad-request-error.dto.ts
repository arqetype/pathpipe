export class BadRequestErrorDto {
  statusCode: 400;
  message: string[] | string;
  error: 'Bad Request';
}
