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
} from '@repo/ui/components/alert-dialog';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Field, FieldLabel, FieldError } from '@repo/ui/components/field';
import { Button } from '@repo/ui/components/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui/components/input-otp';
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
  const [dialogOpen, setDialogOpen] = useState(false);

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
      setDialogOpen(true);
    }
    setIsInitiating(false);
  };

  const handleClose = () => {
    if (isConfirming) return;

    setDialogOpen(false);
    form.reset();
    setSwitchChecked(user.need_otp);
  };

  const onSubmit = async (enableOtpDto: EnableOtpDto) => {
    if (isConfirming) return;

    setIsConfirming(true);

    const result = await enableOtpActionConfirm(enableOtpDto);

    if (result.success) {
      setSwitchChecked(!user.need_otp);
      setDialogOpen(false);
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
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div className="flex flex-row gap-3 items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="otp">Enable One-Time Password (OTP)</Label>
          <p className="text-sm text-muted-foreground">
            Use OTP for additional security during sign-in. This feature is not
            available for GitHub users.
          </p>
        </div>
        <Switch
          id="otp"
          disabled={
            user.is_linkedin_user || user.is_google_user || isInitiating
          }
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
          }}
        >
          <div className="my-4">
            <Controller
              name="otp"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Enter verification code
                  </FieldLabel>
                  <InputOTP
                    maxLength={6}
                    {...field}
                    id={field.name}
                    className="w-full gap-2"
                    aria-invalid={fieldState.invalid}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
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
      </AlertDialogContent>
    </AlertDialog>
  );
}
