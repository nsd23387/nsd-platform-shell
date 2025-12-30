'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import type { ICP, PersonalizationStrategy } from '../../types/campaign';

export type WizardStep = 'basics' | 'ai' | 'icp' | 'personalization' | 'review';

export interface StepMeta {
  id: WizardStep;
  label: string;
  description: string;
}

export const WIZARD_STEPS: StepMeta[] = [
  { id: 'basics', label: 'Campaign Details', description: 'Name and describe your campaign' },
  { id: 'ai', label: 'AI Assist', description: 'Let AI generate your targeting' },
  { id: 'icp', label: 'ICP & Targeting', description: 'Define your ideal customer' },
  { id: 'personalization', label: 'Personalization', description: 'Customize your message' },
  { id: 'review', label: 'Review', description: 'Confirm and create' },
];

interface WizardState {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  name: string;
  description: string;
  icp: ICP;
  personalization: PersonalizationStrategy;
  isLoading: boolean;
  error: string | null;
}

type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'COMPLETE_STEP'; step: WizardStep }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_ICP'; icp: ICP }
  | { type: 'SET_PERSONALIZATION'; personalization: PersonalizationStrategy }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' };

const defaultICP: ICP = {
  keywords: [],
  locations: [],
  industries: [],
  employeeSize: { min: 1, max: 1000 },
  roles: [],
  painPoints: [],
  valuePropositions: [],
};

const defaultPersonalization: PersonalizationStrategy = {
  toneOfVoice: 'professional',
  primaryCTA: '',
  uniqueSellingPoints: [],
  customFields: {},
};

const initialState: WizardState = {
  currentStep: 'basics',
  completedSteps: new Set(),
  name: '',
  description: '',
  icp: defaultICP,
  personalization: defaultPersonalization,
  isLoading: false,
  error: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'COMPLETE_STEP':
      return { ...state, completedSteps: new Set([...Array.from(state.completedSteps), action.step]) };
    case 'SET_NAME':
      return { ...state, name: action.name };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.description };
    case 'SET_ICP':
      return { ...state, icp: action.icp };
    case 'SET_PERSONALIZATION':
      return { ...state, personalization: action.personalization };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: () => boolean;
  getCurrentStepIndex: () => number;
  getStepStatus: (step: WizardStep) => 'completed' | 'current' | 'upcoming';
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const getCurrentStepIndex = () => WIZARD_STEPS.findIndex(s => s.id === state.currentStep);

  const goToStep = (step: WizardStep) => {
    dispatch({ type: 'SET_STEP', step });
  };

  const nextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < WIZARD_STEPS.length - 1) {
      dispatch({ type: 'COMPLETE_STEP', step: state.currentStep });
      dispatch({ type: 'SET_STEP', step: WIZARD_STEPS[currentIndex + 1].id });
    }
  };

  const prevStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', step: WIZARD_STEPS[currentIndex - 1].id });
    }
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 'basics':
        return state.name.trim().length > 0;
      case 'ai':
        return true;
      case 'icp':
        return true;
      case 'personalization':
        return true;
      case 'review':
        return state.name.trim().length > 0;
      default:
        return false;
    }
  };

  const getStepStatus = (step: WizardStep): 'completed' | 'current' | 'upcoming' => {
    if (state.completedSteps.has(step)) return 'completed';
    if (state.currentStep === step) return 'current';
    return 'upcoming';
  };

  return (
    <WizardContext.Provider value={{
      state,
      dispatch,
      goToStep,
      nextStep,
      prevStep,
      canProceed,
      getCurrentStepIndex,
      getStepStatus,
    }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
