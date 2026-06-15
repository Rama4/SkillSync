import type {PipelineStep, StepMetadata} from './types';

const steps = new Map<string, PipelineStep>();

export function registerStep(step: PipelineStep): void {
  if (steps.has(step.id)) {
    // Re-registration is benign in dev (HMR re-runs module init); last-write-wins.
    steps.set(step.id, step);
    return;
  }
  steps.set(step.id, step);
}

export function getStep(id: string): PipelineStep | undefined {
  return steps.get(id);
}

export function listSteps(): StepMetadata[] {
  return Array.from(steps.values()).map(({id, name, description, category}) => ({
    id,
    name,
    description,
    category,
  }));
}

export function clearSteps(): void {
  steps.clear();
}
