import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

type ValidateResponse<T> =
  | { valid: false; errors: string[] }
  | { valid: true; instance: T };

async function validateData<T extends object>(
  dtoClass: new () => T,
  data: unknown,
  errorPrefix: string = 'Invalid data',
): Promise<ValidateResponse<T>> {
  const instance = plainToInstance(dtoClass, data, {
    excludeExtraneousValues: true,
  });

  if (!instance || typeof instance !== 'object') {
    return { valid: false, errors: [`${errorPrefix}: expected an object`] };
  }

  const errors = await validate(instance);

  if (errors.length > 0) {
    return { valid: false, errors: errors.map((e) => e.toString()) };
  }

  return { valid: true, instance };
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; validationErrors: string[] }
  | { success: false; serverError: string }
  | { success: false; outputValidationErrors: string[] };

export function createSafeAction<
  InputDto extends object,
  Output extends object,
>(
  dtoClass: new () => InputDto,
  action: (input: InputDto) => Promise<Output>,
  outputDtoClass?: new () => Output,
) {
  return async (input: unknown): Promise<ActionResult<Output>> => {
    const validationResult = await validateData(
      dtoClass,
      input,
      'Invalid input',
    );
    if (!validationResult.valid) {
      return {
        success: false,
        validationErrors: validationResult.errors,
      };
    }

    try {
      const data = await action(validationResult.instance);

      if (outputDtoClass) {
        const outputValidationResult = await validateData(
          outputDtoClass,
          data,
          'Invalid output',
        );

        if (!outputValidationResult.valid) {
          return {
            success: false,
            outputValidationErrors: outputValidationResult.errors,
          };
        }
        return { success: true, data: outputValidationResult.instance };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        serverError:
          error instanceof Error ? error.message : 'Unknown server error',
      };
    }
  };
}
