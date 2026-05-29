import { create } from 'zustand';
import type { Application } from '@repo/db/entities/application';
import type { ApplicationStatus } from '@repo/db/types/application/status';

type ApplicationStore = {
  applications: Application[];
  selectedApplicationId: string | null;
  isCreateDialogOpen: boolean;
  status: ApplicationStatus | null;
  setApplications: (applications: Application[]) => void;
  openCreateDialog: (columnId: ApplicationStatus | null) => void;
  closeCreateDialog: () => void;
  addApplication: (application: Application) => void;
  patchApplication: (
    id: string,
    data: Partial<Application>,
  ) => Application | undefined;
  removeApplication: (id: string) => void;
};

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],
  selectedApplicationId: null,
  isCreateDialogOpen: false,
  status: null,

  setApplications: (applications) => set({ applications }),

  openCreateDialog: (columnId) =>
    set({ isCreateDialogOpen: true, status: columnId || null }),

  closeCreateDialog: () => set({ isCreateDialogOpen: false, status: null }),

  addApplication: (application) =>
    set((state) => ({ applications: [...state.applications, application] })),

  patchApplication: (id, data) => {
    const previous = get().applications.find((a) => a.id === id);
    set((state) => ({
      applications: state.applications.map((application) =>
        application.id === id ? { ...application, ...data } : application,
      ),
    }));
    return previous;
  },

  removeApplication: (id) =>
    set((state) => ({
      applications: state.applications.filter(
        (application) => application.id !== id,
      ),
    })),
}));
