'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { useForm } from 'react-hook-form';
import { useState, useTransition } from 'react';
import { Button } from '@repo/ui/components/button';
import { Loader2Icon } from 'lucide-react';
import resendEmailAction from '@/actions/auth/resend-email';
import { ResendEmailDto } from '@repo/db/dto/resend-email.dto';
import { redirect, useSearchParams } from 'next/navigation';

export function ResendEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  if (!email) {
    redirect('/app/sign-in');
  }

  const form = useForm<ResendEmailDto>({
    defaultValues: {
      email,
    },
  });

  const handleSubmit = async (data: ResendEmailDto) => {
    setIsSuccess(false);
    form.clearErrors();

    startTransition(async () => {
      const response = await resendEmailAction(data.email);

      if (!response.success) {
        form.setError('email', {
          type: 'manual',
          message: response.message,
        });
      } else {
        setIsSuccess(true);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col">
          <CardTitle className="text-2xl font-bold">
            Verify your email address
          </CardTitle>
        </div>
        <CardDescription className="mt-4">
          Please check your email for a verification link. If you didn&apos;t
          receive the email, you can request a new one.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={true} autoComplete="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="space-y-4 flex-col">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                'Resend Verification Link'
              )}
            </Button>
            {isSuccess && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
                ✅ Verification email sent successfully! Please check your
                inbox.
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
