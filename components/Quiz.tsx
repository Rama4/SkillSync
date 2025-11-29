'use client';

import { useState } from 'react';
import { QuizQuestion } from '@/lib/types';
import { Check, X, ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import { useProgressStore } from '@/lib/store';

interface QuizProps {
  questions: QuizQuestion[];
  topicId: string;
  lessonId: string;
  onComplete: () => void;
}

export default function Quiz({ questions, topicId, lessonId, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  const { saveQuizScore } = useProgressStore();

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (answerIndex: number) => {
    if (showExplanation) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === question.correctAnswer) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      const finalScore = Math.round((correctAnswers / questions.length) * 100);
      saveQuizScore(topicId, lessonId, finalScore);
      setIsComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCorrectAnswers(0);
    setIsComplete(false);
  };

  if (isComplete) {
    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= 70;

    return (
      <div className="card p-8 text-center max-w-lg mx-auto animate-fade-in">
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
          passed ? 'bg-green-500/20' : 'bg-yellow-500/20'
        }`}>
          <Trophy className={`w-10 h-10 ${passed ? 'text-green-400' : 'text-yellow-400'}`} />
        </div>
        
        <h3 className="text-2xl font-bold font-display text-white mb-2">
          {passed ? 'Congratulations!' : 'Keep Practicing!'}
        </h3>
        
        <p className="text-gray-400 mb-6">
          You scored <span className={`font-bold ${passed ? 'text-green-400' : 'text-yellow-400'}`}>{score}%</span> ({correctAnswers}/{questions.length} correct)
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-lg bg-surface-3 text-gray-300 hover:bg-surface-4 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Quiz
          </button>
          {passed && (
            <button
              onClick={onComplete}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              Complete Lesson
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Question {currentQuestion + 1} of {questions.length}</span>
          <span className="text-primary-400 font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="card p-6 mb-6">
        <h3 className="text-xl font-semibold text-white mb-6">{question.question}</h3>
        
        <div className="space-y-3">
          {question.options?.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === question.correctAnswer;
            
            let optionClass = 'quiz-option border-2 border-surface-3 rounded-xl p-4 cursor-pointer transition-all';
            
            if (showExplanation) {
              if (isCorrectAnswer) {
                optionClass += ' correct border-green-500 bg-green-500/10';
              } else if (isSelected && !isCorrectAnswer) {
                optionClass += ' incorrect border-red-500 bg-red-500/10';
              }
            } else if (isSelected) {
              optionClass += ' selected border-primary-500 bg-primary-500/10';
            }

            return (
              <div
                key={index}
                className={optionClass}
                onClick={() => handleAnswer(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    showExplanation && isCorrectAnswer 
                      ? 'bg-green-500 text-white' 
                      : showExplanation && isSelected && !isCorrectAnswer
                        ? 'bg-red-500 text-white'
                        : 'bg-surface-3 text-gray-400'
                  }`}>
                    {showExplanation && isCorrectAnswer ? (
                      <Check className="w-4 h-4" />
                    ) : showExplanation && isSelected && !isCorrectAnswer ? (
                      <X className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span className={showExplanation && isCorrectAnswer ? 'text-white font-medium' : 'text-gray-300'}>
                    {option}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className={`card p-4 mb-6 border-l-4 ${isCorrect ? 'border-green-500' : 'border-yellow-500'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div>
              <p className={`font-medium mb-1 ${isCorrect ? 'text-green-400' : 'text-yellow-400'}`}>
                {isCorrect ? 'Correct!' : 'Not quite right'}
              </p>
              <p className="text-gray-400 text-sm">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Next button */}
      {showExplanation && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
        >
          {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

