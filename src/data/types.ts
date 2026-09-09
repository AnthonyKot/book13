export type ModuleId = 'think' | 'solve' | 'ship' | 'serve';

export interface CourseModule {
  id: ModuleId;
  title: string;
  description: string;
}

export interface PredictionOption {
  id: string;
  label: string;
  explanation: string;
}

export interface Chapter {
  id: string;
  order: number;
  module: ModuleId;
  title: string;
  mentalModel: string;
  outcome: string;
  recognitionCue: string;
  prediction: {
    prompt: string;
    code?: string;
    options: PredictionOption[];
    correctOptionId: string;
  };
  lesson: string;
  challenge: {
    title: string;
    description: string;
  };
  starterCode: string;
  hiddenTestCode: string;
  contractFailureMessage?: string;
  testNames: string[];
  hints: string[];
  debrief: {
    title: string;
    summary: string;
    transfer: string;
  };
}

export interface RuntimeTestResult {
  name: string;
  passed: boolean;
  message: string;
}

export type RuntimeStatus =
  | 'passed'
  | 'failed'
  | 'compile_error'
  | 'runtime_error'
  | 'unavailable';

export interface RuntimeResult {
  status: RuntimeStatus;
  stdout: string;
  error?: string;
  tests: RuntimeTestResult[];
}

export const courseModules: CourseModule[] = [
  {
    id: 'think',
    title: 'Think in Go',
    description: 'Replace familiar-looking assumptions with Go’s actual value, error, slice, and text models.',
  },
  {
    id: 'solve',
    title: 'Solve in Go',
    description: 'Use Go’s data structures and library contracts without importing habits from another language.',
  },
  {
    id: 'ship',
    title: 'Ship in Go',
    description: 'Give concurrent work a lifetime, protect scarce resources, and draw narrow dependency boundaries.',
  },
  {
    id: 'serve',
    title: 'Serve in Go',
    description: 'Write the code around a service — the query layer, contracts and handlers — without inheriting an ORM’s or router’s silent defaults. These labs run on small stubs of the real APIs and say so.',
  },
];
