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

// Available images in public/images folder
// Add new image filenames here when adding images to public/images/
export const AVAILABLE_IMAGES: string[] = [
  '/images/1.png',
  '/images/2.png',
  '/images/3.png',
  '/images/4.png',
  '/images/5.png',
  '/images/6.png',
  '/images/7.png',
  '/images/8.png',
  '/images/9.png',
  '/images/10.png',
  '/images/Q181.png',
  '/images/situations.png',
];
