import { validate } from 'class-validator';
import { plainToInstance, instanceToPlain } from 'class-transformer';
import { getCurrentUserOrNull } from './auth-server';
import { User } from '@repo/db/entities/user';

type ValidateResponse<T> =
  | { valid: false; errors: string[] }
  | { valid: true; instance: T };

async function validateData<T extends object>(
  dtoClass: new () => T,
  data: unknown,
  errorPrefix: string = 'Invalid data',
): Promise<ValidateResponse<T>> {
  const instance = plainToInstance(dtoClass, data);

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
  | { success: false; error: 'input'; message: string }
  | { success: false; error: 'server'; message: string }
  | { success: false; error: 'output'; message: string }
  | { success: false; error: 'auth'; message: string };

type ActionContext<TInput = unknown> = {
  parsedInput: TInput;
  user?: User;
};

class ActionClientBuilder<TInput = unknown, TOutput = unknown> {
  private _inputDto?: new () => TInput;
  private _outputDto?: new () => TOutput;
  private _needsAuth: boolean = false;

  constructor(
    inputDto?: new () => TInput,
    outputDto?: new () => TOutput,
    needsAuth: boolean = false,
  ) {
    this._inputDto = inputDto;
    this._outputDto = outputDto;
    this._needsAuth = needsAuth;
  }

  needsAuth(): ActionClientBuilder<TInput, TOutput> {
    return new ActionClientBuilder<TInput, TOutput>(
      this._inputDto,
      this._outputDto,
      true,
    );
  }

  inputDto<TNewInput extends object>(
    dto: new () => TNewInput,
  ): ActionClientBuilder<TNewInput, TOutput> {
    return new ActionClientBuilder<TNewInput, TOutput>(
      dto,
      this._outputDto as new () => TOutput,
      this._needsAuth,
    );
  }

  outputDto<TNewOutput extends object>(
    dto: new () => TNewOutput,
  ): ActionClientBuilder<TInput, TNewOutput> {
    return new ActionClientBuilder<TInput, TNewOutput>(
      this._inputDto as new () => TInput,
      dto,
      this._needsAuth,
    );
  }

  action(
    handler: (context: ActionContext<TInput>) => Promise<TOutput>,
  ): (input: unknown) => Promise<ActionResult<TOutput>> {
    return async (input: unknown): Promise<ActionResult<TOutput>> => {
      let user: User | undefined;

      if (this._needsAuth) {
        const currentUser = await getCurrentUserOrNull();

        if (!currentUser) {
          return {
            success: false,
            error: 'auth',
            message: 'Authentication required',
          };
        }
        user = currentUser;
      }

      let parsedInput: TInput = input as TInput;

      if (this._inputDto) {
        const validationResult = await validateData(
          this._inputDto as new () => object,
          input,
          'Invalid input',
        );

        if (!validationResult.valid) {
          return {
            success: false,
            error: 'input',
            message: validationResult.errors[0] || 'Unknown input error',
          };
        }
        parsedInput = validationResult.instance as TInput;
      }

      try {
        const data = await handler({ parsedInput, user });

        if (this._outputDto) {
          const outputValidationResult = await validateData(
            this._outputDto as new () => object,
            data,
            'Invalid output',
          );

          if (!outputValidationResult.valid) {
            return {
              success: false,
              error: 'output',
              message:
                outputValidationResult.errors[0] || 'Unknown output error',
            };
          }

          return {
            success: true,
            data: instanceToPlain(outputValidationResult.instance) as TOutput,
          };
        }

        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: 'server',
          message:
            error instanceof Error ? error.message : 'Unknown server error',
        };
      }
    };
  }
}

export const action = new ActionClientBuilder();

export type { ActionResult, ActionContext };
