'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type WizardStep = 'basics' | 'ai' | 'icp' | 'personalization' | 'review';

interface ICP {
  keywords: string[];
  locations: { country: string; state?: string; city?: string }[];
  industries: string[];
  employeeSize: { min: number; max: number };
  roles: string[];
  painPoints: string[];
  valuePropositions: string[];
}

interface Personalization {
  toneOfVoice: string;
  cta: string;
  usp: string;
}

interface WizardData {
  name: string;
  description: string;
  icp: ICP;
  personalization: Personalization;
}

interface WizardContextType {
  currentStep: WizardStep;
  setCurrentStep: (step: WizardStep) => void;
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  updateICP: (updates: Partial<ICP>) => void;
  updatePersonalization: (updates: Partial<Personalization>) => void;
  canProceed: boolean;
  steps: { id: WizardStep; label: string; completed: boolean }[];
}

const defaultICP: ICP = {
  keywords: [],
  locations: [],
  industries: [],
  employeeSize: { min: 10, max: 500 },
  roles: [],
  painPoints: [],
  valuePropositions: [],
};

const defaultPersonalization: Personalization = {
  toneOfVoice: 'professional',
  cta: '',
  usp: '',
};

const defaultData: WizardData = {
  name: '',
  description: '',
  icp: defaultICP,
  personalization: defaultPersonalization,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [data, setData] = useState<WizardData>(defaultData);

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const updateICP = (updates: Partial<ICP>) => {
    setData(prev => ({
      ...prev,
      icp: { ...prev.icp, ...updates },
    }));
  };

  const updatePersonalization = (updates: Partial<Personalization>) => {
    setData(prev => ({
      ...prev,
      personalization: { ...prev.personalization, ...updates },
    }));
  };

  const steps: { id: WizardStep; label: string; completed: boolean }[] = [
    { id: 'basics', label: 'Basics', completed: data.name.length > 0 },
    { id: 'ai', label: 'AI Assist', completed: currentStep !== 'basics' && currentStep !== 'ai' },
    { id: 'icp', label: 'ICP', completed: data.icp.keywords.length > 0 || data.icp.industries.length > 0 },
    { id: 'personalization', label: 'Personalization', completed: data.personalization.cta.length > 0 },
    { id: 'review', label: 'Review', completed: false },
  ];

  const canProceed = (() => {
    switch (currentStep) {
      case 'basics':
        return data.name.trim().length > 0;
      case 'ai':
        return true;
      case 'icp':
        return true;
      case 'personalization':
        return true;
      case 'review':
        return data.name.trim().length > 0;
      default:
        return false;
    }
  })();

  return (
    <WizardContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        data,
        updateData,
        updateICP,
        updatePersonalization,
        canProceed,
        steps,
      }}
    >
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
