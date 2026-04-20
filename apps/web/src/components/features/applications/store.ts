import { create } from 'zustand';
import type { Candidate } from '@repo/db/entities/candidate';
import type { CandidateStage } from '@repo/db/types/candidate/stage';

type ApplicationStore = {
  applications: Candidate[];
  selectedApplicationId: string | null;
  isCreateDialogOpen: boolean;
  stage: CandidateStage | null;
  setApplications: (applications: Candidate[]) => void;
  selectApplication: (id: string | null) => void;
  openCreateDialog: (columnId: CandidateStage | null) => void;
  closeCreateDialog: () => void;
  addApplication: (application: Candidate) => void;
  patchApplication: (
    id: string,
    data: Partial<Candidate>,
  ) => Candidate | undefined;
  removeApplication: (id: string) => void;
};

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],
  selectedApplicationId: null,
  isCreateDialogOpen: false,
  stage: null,

  setApplications: (applications) => set({ applications }),

  selectApplication: (id) => set({ selectedApplicationId: id }),

  openCreateDialog: (columnId) =>
    set({ isCreateDialogOpen: true, stage: columnId || null }),

  closeCreateDialog: () => set({ isCreateDialogOpen: false, stage: null }),

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
