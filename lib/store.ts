'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressState {
  // Track completed lessons per topic
  completedLessons: Record<string, string[]>;
  // Track quiz scores
  quizScores: Record<string, Record<string, number>>;
  // Track current section within a lesson
  currentSections: Record<string, number>;
  
  // Actions
  markLessonComplete: (topicId: string, lessonId: string) => void;
  isLessonComplete: (topicId: string, lessonId: string) => boolean;
  getTopicProgress: (topicId: string, totalLessons: number) => number;
  saveQuizScore: (topicId: string, lessonId: string, score: number) => void;
  getQuizScore: (topicId: string, lessonId: string) => number | null;
  setCurrentSection: (lessonId: string, sectionIndex: number) => void;
  getCurrentSection: (lessonId: string) => number;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedLessons: {},
      quizScores: {},
      currentSections: {},
      
      markLessonComplete: (topicId, lessonId) => {
        set((state) => {
          const topicLessons = state.completedLessons[topicId] || [];
          if (!topicLessons.includes(lessonId)) {
            return {
              completedLessons: {
                ...state.completedLessons,
                [topicId]: [...topicLessons, lessonId],
              },
            };
          }
          return state;
        });
      },
      
      isLessonComplete: (topicId, lessonId) => {
        const topicLessons = get().completedLessons[topicId] || [];
        return topicLessons.includes(lessonId);
      },
      
      getTopicProgress: (topicId, totalLessons) => {
        const completed = get().completedLessons[topicId]?.length || 0;
        return totalLessons > 0 ? (completed / totalLessons) * 100 : 0;
      },
      
      saveQuizScore: (topicId, lessonId, score) => {
        set((state) => ({
          quizScores: {
            ...state.quizScores,
            [topicId]: {
              ...state.quizScores[topicId],
              [lessonId]: score,
            },
          },
        }));
      },
      
      getQuizScore: (topicId, lessonId) => {
        return get().quizScores[topicId]?.[lessonId] ?? null;
      },
      
      setCurrentSection: (lessonId, sectionIndex) => {
        set((state) => ({
          currentSections: {
            ...state.currentSections,
            [lessonId]: sectionIndex,
          },
        }));
      },
      
      getCurrentSection: (lessonId) => {
        return get().currentSections[lessonId] ?? 0;
      },
    }),
    {
      name: 'skillsync-progress',
    }
  )
);

