'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { Loader2Icon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { createApplicationAction } from '@/actions/application/create';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: ApplicationStatus.WISHLIST, label: 'Wishlist' },
  { value: ApplicationStatus.APPLIED, label: 'Applied' },
  { value: ApplicationStatus.INTERVIEW, label: 'Interview' },
  { value: ApplicationStatus.OFFER, label: 'Offer' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected' },
  { value: ApplicationStatus.GHOSTED, label: 'Ghosted' },
];

export function CreateApplicationDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateApplicationDto>({
    resolver: classValidatorResolver(CreateApplicationDto),
    defaultValues: {
      company: '',
      position: '',
      status: ApplicationStatus.WISHLIST,
      url: '',
      salaryMin: undefined,
      salaryMax: undefined,
      appliedAt: '',
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    setOpen(next);
  }

  function onSubmit(data: CreateApplicationDto) {
    startTransition(async () => {
      const result = await createApplicationAction({
        ...data,
        url: data.url || undefined,
        appliedAt: data.appliedAt || undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? 'Failed to create application.');
        return;
      }

      toast.success('Application added.');
      setOpen(false);
      form.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" />
          New application
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appliedAt"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Applied date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://jobs.example.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="salaryMin"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Salary min</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salaryMax"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Salary max</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="80000"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add application'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
