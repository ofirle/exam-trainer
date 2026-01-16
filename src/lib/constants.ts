import type { AlgorithmConfig } from './types';

export const CONFIG: AlgorithmConfig = {
  MASTER_STREAK: 3,
  WRONG_INTERVAL: 7,
  INTERVAL_BY_STREAK: {
    1: 15,
    2: 40,
    3: 120,
    4: 250,
  },
  RECENT_BLOCK_SIZE: 5,
  SELECTION_POLICY_DUE_PROB: 0.7,
  EXAM_QUESTION_COUNT: 50,
};

export const STORAGE_KEY = 'examTrainerState.v1';

// Re-export AVAILABLE_IMAGES from auto-generated file
export { AVAILABLE_IMAGES } from './availableImages';
