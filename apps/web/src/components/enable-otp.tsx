'use client';

import { User } from '@repo/db/entities/user';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AlertDialogRef,
} from '@repo/ui/components/alert-dialog';
import { useRef, useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Button } from '@repo/ui/components/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui/components/input-otp';
import { useForm } from 'react-hook-form';
import { EnableOtpDto } from '@repo/db/dto/auth/enable-otp.dto';
import {
  enableOtpAction,
  enableOtpActionConfirm,
} from '@/actions/auth/enable-otp';
import { toast } from 'sonner';

type EnableOtpProps = {
  user: User;
};

export default function EnableOtp({ user }: EnableOtpProps) {
  const [switchChecked, setSwitchChecked] = useState(user.need_otp);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const dialogRef = useRef<AlertDialogRef>(null);

  const form = useForm<EnableOtpDto>({
    defaultValues: {
      otp: '',
    },
  });

  const handleToggle = async () => {
    if (isInitiating) return;

    const newState = !switchChecked;
    setSwitchChecked(newState);
    setIsInitiating(true);

    const response = await enableOtpAction();

    if (!response.success) {
      toast.error(response.message);
      setSwitchChecked(user.need_otp);
    } else {
      dialogRef.current?.open();
    }
    setIsInitiating(false);
  };

  const handleClose = () => {
    if (isConfirming) return;

    dialogRef.current?.close();
    form.reset();
    setSwitchChecked(user.need_otp);
  };

  const onSubmit = async (enableOtpDto: EnableOtpDto) => {
    if (isConfirming) return;

    setIsConfirming(true);

    const result = await enableOtpActionConfirm(enableOtpDto);

    if (result.success) {
      setSwitchChecked(!user.need_otp);
      dialogRef.current?.close();
      form.reset();
      toast.success(result.data.message);
    } else {
      form.setError('otp', {
        type: 'manual',
        message: result.message,
      });
    }

    setIsConfirming(false);
  };

  return (
    <AlertDialog ref={dialogRef}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Enable One-Time Password (OTP)</Label>
          <p className="text-sm text-muted-foreground">
            Use OTP for additional security during sign-in. This feature is not
            available for GitHub users.
          </p>
        </div>
        <Switch
          disabled={user.is_github_user || isInitiating}
          onCheckedChange={handleToggle}
          checked={switchChecked}
        />
      </div>
      <AlertDialogContent className="gap-0">
        <AlertDialogHeader>
          <AlertDialogTitle>
            You are about to {user.need_otp ? 'disable' : 'enable'} OTP for your
            account
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user.need_otp
              ? 'OTP adds an extra layer of security to your account. If you disable it, you will no longer need to enter a one-time password during sign-in. To disable OTP, please enter the verification code sent to your registered email.'
              : 'Enabling OTP will require you to enter a one-time password during sign-in, enhancing the security of your account. To enable OTP, please enter the verification code sent to your registered email.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
          >
            <div>
              <FormField
                key="otp"
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="my-4">
                    <FormLabel>Enter verification code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        {...field}
                        className="w-full gap-2"
                        onComplete={(value) => {
                          if (value.length === 6) {
                            form.clearErrors('otp');
                          }
                        }}
                      >
                        <InputOTPGroup className="w-full">
                          {[...Array(6)].map((_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="w-[15%] md:w-[20%] h-12 text-2xl"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>
            <AlertDialogFooter>
              <div className="flex justify-between w-full">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isConfirming}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isConfirming}>
                  {isConfirming
                    ? 'Processing...'
                    : user.need_otp
                      ? 'Disable OTP'
                      : 'Enable OTP'}
                </Button>
              </div>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
