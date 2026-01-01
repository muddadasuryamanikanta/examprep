import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useTestStore } from '../store/testStore';
import { useAuthStore } from '../store/authStore';

// Components
import { TestHeader } from '../components/test-screen/TestHeader';
import { TestSidebar } from '../components/test-screen/TestSidebar';
import { QuestionArea } from '../components/test-screen/QuestionArea';
import { FullScreenWarning } from '../components/test-screen/FullScreenWarning';
import { TestCompleted } from '../components/test-screen/TestCompleted';

export default function TestScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentTest: test, isLoading: loading, fetchTest, submitTest } = useTestStore();
    const { user } = useAuthStore();
    
    // Local state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Status tracking
    const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
    const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
    
    // Time tracking
    const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
    const startTimeRef = useRef<number>(Date.now());
    
    // Focus tracking
    const [focusWarnings, setFocusWarnings] = useState<{timestamp: Date, reason: string}[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Initial fetch
    useEffect(() => {
        if (id) {
            fetchTest(id);
        }
    }, [id, fetchTest]);

    // Initialize state from test data
    useEffect(() => {
        if (test && test._id === id) {
             const existingAnswers: Record<string, unknown> = {};
             test.questions.forEach((q) => {
                 if (q.userAnswer) existingAnswers[q.blockId] = q.userAnswer;
             });
             setAnswers(existingAnswers);
             
             if (test.warnings && test.warnings.length > 0) {
                 setFocusWarnings(test.warnings.map(w => ({ ...w, timestamp: new Date(w.timestamp) })));
             }
        }
    }, [test, id]);

    // Track time spent per question
    useEffect(() => {
        startTimeRef.current = Date.now();
        
        return () => {
            if (!test) return;
            const now = Date.now();
            const duration = (now - startTimeRef.current) / 1000;
            const q = test.questions[currentQuestionIndex];
            if (q) {
                setQuestionTimes(prev => ({
                    ...prev,
                    [q.blockId]: (prev[q.blockId] || 0) + duration
                }));
            }
        };
    }, [currentQuestionIndex, test]);


    // Navigation Helper
    const changeQuestion = useCallback((index: number) => {
        setVisitedQuestions(prev => new Set(prev).add(index));
        setCurrentQuestionIndex(index);
    }, []);

    const handleSubmitTest = useCallback(async (finalWarnings = focusWarnings) => {
        if (submitting || !id) return;
        setSubmitting(true);
        
        // Capture meaningful time for the very last active moment
        const now = Date.now();
        const duration = (now - startTimeRef.current) / 1000;
        const currentBlockId = test?.questions[currentQuestionIndex]?.blockId;
        
        const finalTimes = { ...questionTimes };
        if (currentBlockId) {
             finalTimes[currentBlockId] = (finalTimes[currentBlockId] || 0) + duration;
        }

        try {
            await submitTest(id, {
                answers,
                warnings: finalWarnings,
                timeSpent: finalTimes
            });
        } catch (err) {
            console.error(err);
            setSubmitting(false);
            alert("Failed to submit test. Please try again.");
        }
    }, [submitting, id, focusWarnings, answers, submitTest, questionTimes, currentQuestionIndex, test]);

    const registerWarning = useCallback((reason: string) => {
        if (submitting) return; 
        
        const now = new Date();
        setFocusWarnings(prev => {
            if (prev.length > 0) {
                // Debounce warnings (2 seconds)
                const last = new Date(prev[prev.length - 1].timestamp).getTime();
                if (now.getTime() - last < 2000) return prev;
            }
            
            const newWarnings = [...prev, { timestamp: now, reason }];
            
            if (newWarnings.length >= 3) {
                handleSubmitTest(newWarnings);
            }
            
            return newWarnings;
        });
    }, [submitting, handleSubmitTest]);

    const enterFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
            alert("Full screen mode is required for this test.");
        }
    }, []);

    // Full screen enforcement & Focus tracking
    useEffect(() => {
        if (!test || test.status === 'COMPLETED') return;

        const handleFocusLoss = () => {
             if (document.visibilityState === 'hidden' || !document.hasFocus()) {
                 registerWarning("Focus lost (tab switch or background)");
             }
        };
        
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            if (!document.fullscreenElement) {
                registerWarning("Exited full-screen mode");
            }
        };

        window.addEventListener('blur', handleFocusLoss);
        document.addEventListener('visibilitychange', handleFocusLoss);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('blur', handleFocusLoss);
            document.removeEventListener('visibilitychange', handleFocusLoss);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [test, registerWarning]);

    // Timer Logic
    useEffect(() => {
        if (!test) return;
        
        // Ensure we have a valid start time
        const startString = test.startTime || test.createdAt || new Date().toISOString();
        const start = new Date(startString);
        if (isNaN(start.getTime())) return; 

        const startTime = start.getTime();
        const durationMinutes = test.config?.duration || 60; 
        const durationMs = durationMinutes * 60 * 1000;
        const endTime = startTime + durationMs;
        
        const updateTimer = () => {
            const now = Date.now();
            if (test.status === 'COMPLETED') {
                setTimeLeft(0);
                return;
            }

            const diff = Math.ceil((endTime - now) / 1000);
            
            if (diff <= 0) {
                setTimeLeft(0);
                if (test.status === 'IN_PROGRESS' && !submitting) {
                     handleSubmitTest();
                }
            } else {
                setTimeLeft(diff);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        
        return () => clearInterval(interval);
    }, [test, submitting, handleSubmitTest]);


    const handleAnswerUpdate = (blockId: string, value: unknown) => {
        setAnswers(prev => ({ ...prev, [blockId]: value }));
    };

    const handleClearResponse = () => {
        const currentQuestion = test?.questions[currentQuestionIndex];
        if (!currentQuestion) return;
        const blockId = currentQuestion.blockSnapshot._id;
        const newAnswers = { ...answers };
        delete newAnswers[blockId];
        setAnswers(newAnswers);
    };

    const handleMarkForReview = () => {
        setMarkedForReview(prev => {
            const next = new Set(prev);
            if (next.has(currentQuestionIndex)) next.delete(currentQuestionIndex);
            else next.add(currentQuestionIndex);
            return next;
        });
        if (currentQuestionIndex < (test?.questions.length || 0) - 1) {
            changeQuestion(currentQuestionIndex + 1);
        }
    };

    const handleSaveAndNext = () => {
        if (currentQuestionIndex < (test?.questions.length || 0) - 1) {
            changeQuestion(currentQuestionIndex + 1);
        } else {
            // Optional: prompt to submit if last question
        }
    };
    
    // --- Render ---

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!test) return <div className="p-8 text-center bg-background text-foreground">Test not found</div>;

    if (test.status === 'COMPLETED') {
        return (
            <TestCompleted 
                score={test.score || 0}
                totalMarks={test.totalMarks || 0}
                onReturn={() => navigate('/tests')}
            />
        );
    }

    if (!isFullscreen) {
        return (
            <FullScreenWarning 
                onEnterFullscreen={enterFullscreen}
                onCancel={() => navigate('/tests')}
            />
        );
    }

    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="p-8">Question not found</div>;
    const currentBlock = currentQuestion.blockSnapshot;

    return (
        <div className="flex h-screen w-screen overflow-hidden flex-col bg-background font-sans text-foreground">
           
           <TestHeader 
                title={`${test.config?.questionCount || test.questions.length} Questions Test`}
                timeLeft={timeLeft}
                totalQuestions={test.questions.length}
           />
        
           <div className="flex-1 flex overflow-hidden">
              <QuestionArea 
                  questionIndex={currentQuestionIndex}
                  questionBlock={currentBlock}
                  userAnswer={answers[currentBlock._id]}
                  onAnswerChange={(val) => handleAnswerUpdate(currentBlock._id, val)}
                  onMarkForReview={handleMarkForReview}
                  onClearResponse={handleClearResponse}
                  onSaveAndNext={handleSaveAndNext}
                  isLastQuestion={currentQuestionIndex === test.questions.length - 1}
              />
        
              <TestSidebar 
                  userName={user?.name || 'Guest User'}
                  questions={test.questions}
                  currentQuestionIndex={currentQuestionIndex}
                  answers={answers}
                  markedForReview={markedForReview}
                  visitedQuestions={visitedQuestions}
                  onQuestionChange={changeQuestion}
                  onSubmit={() => handleSubmitTest()}
              />
           </div>
        </div>
    );
}
