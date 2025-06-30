'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import Image from 'next/image';
import { ResetPasswordDto } from '@repo/db/dto/auth/reset-password.dto';
import { useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import type { UUID } from 'node:crypto';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Button, buttonVariants } from '@repo/ui/components/button';
import { useState, useTransition } from 'react';
import resetPasswordAction from '@/actions/auth/reset-password';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { CheckCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@repo/ui/lib/utils';
import { ResetPasswordUserResponseDto } from '@repo/db/dto/auth/reset-password-user.dto';

type ResetPasswordPageProps = {
  token: UUID;
  user: ResetPasswordUserResponseDto;
};

export default function ResetPasswordForm({
  token,
  user,
}: ResetPasswordPageProps) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | false>(false);

  const form = useForm<ResetPasswordDto>({
    resolver: classValidatorResolver(ResetPasswordDto),
    defaultValues: {
      token,
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = (data: ResetPasswordDto) => {
    startTransition(async () => {
      const response = await resetPasswordAction(
        data.newPassword,
        data.confirmPassword,
        data.token,
      );

      if (response.success) {
        setSuccess(response.message);
        form.reset();
      } else {
        form.setError('newPassword', {
          type: 'manual',
          message: response.message,
        });
      }
    });
  };

  return (
    <Card className="border shadow-md max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Image
              src={user.avatar_url}
              alt="User Avatar"
              width={40}
              height={40}
              className="rounded-full"
            />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Hello {user.name},</CardTitle>
        <CardDescription className="text-base">
          Did you forget your password? No problem, we can help you reset it.
        </CardDescription>
      </CardHeader>
      {success === false ? (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Form {...form}>
            <CardContent className="space-y-4">
              <FormField
                key="newPassword"
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your new password"
                        disabled={pending || success !== false}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                key="confirmPassword"
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your new password"
                        {...field}
                        disabled={pending || success !== false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="mt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={pending || success !== false}
              >
                Reset Password
              </Button>
            </CardFooter>
          </Form>
        </form>
      ) : (
        <>
          <CardContent>
            <Alert>
              <CheckCircleIcon />
              <AlertTitle>Password reset successfully!</AlertTitle>
              <AlertDescription>
                You can now log in with your new password.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link
              className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
              href="/app/sign-in"
            >
              Go to Sign In
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
