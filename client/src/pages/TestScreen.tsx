import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Maximize2, CheckCircle, User } from 'lucide-react';
import { Button } from '../components/common/Button';
import { ContentBlockDisplay } from '../components/content-blocks/ContentBlockDisplay';
import { Modal } from '../components/common/Modal';
import { useTestStore } from '../store/testStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

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
    
    // Focus tracking
    const [focusWarnings, setFocusWarnings] = useState<{timestamp: Date, reason: string}[]>([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
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

    // Navigation Helper
    const changeQuestion = (index: number) => {
        setVisitedQuestions(prev => new Set(prev).add(index));
        setCurrentQuestionIndex(index);
    };

    const handleSubmitTest = useCallback(async (finalWarnings = focusWarnings) => {
        if (submitting || !id) return;
        setSubmitting(true);
        
        try {
            await submitTest(id, {
                answers,
                warnings: finalWarnings
            });
        } catch (err) {
            console.error(err);
            setSubmitting(false);
            alert("Failed to submit test. Please try again.");
        }
    }, [submitting, id, focusWarnings, answers, submitTest]);

    const registerWarning = useCallback((reason: string) => {
        if (submitting) return; 
        
        const now = new Date();
        setFocusWarnings(prev => {
            if (prev.length > 0) {
                const last = new Date(prev[prev.length - 1].timestamp).getTime();
                if (now.getTime() - last < 2000) return prev;
            }
            
            const newWarnings = [...prev, { timestamp: now, reason }];
            
            if (newWarnings.length >= 3) {
                handleSubmitTest(newWarnings);
            } else {
                setShowWarningModal(true);
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
        if (isNaN(start.getTime())) return; // Invalid date

        const startTime = start.getTime();
        const durationMinutes = test.config?.duration || 60; 
        const durationMs = durationMinutes * 60 * 1000;
        const endTime = startTime + durationMs;
        
        const updateTimer = () => {
            const now = Date.now();
            // If test is completed, show 0
            if (test.status === 'COMPLETED') {
                setTimeLeft(0);
                return;
            }

            const diff = Math.ceil((endTime - now) / 1000);
            
            if (diff <= 0) {
                setTimeLeft(0);
                // Auto-submit if time runs out and visible status is still in progress
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

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerUpdate = (blockId: string, value: unknown) => {
        setAnswers(prev => ({ ...prev, [blockId]: value }));
    };

    const handleClearResponse = () => {
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
        // Also move to next
        if (currentQuestionIndex < (test?.questions.length || 0) - 1) {
            changeQuestion(currentQuestionIndex + 1);
        }
    };

    const handleSaveAndNext = () => {
        // Just move next, assuming answers are updated in real-time
        if (currentQuestionIndex < (test?.questions.length || 0) - 1) {
            changeQuestion(currentQuestionIndex + 1);
        }
    };
    
    // Status helpers
    const getQuestionStatus = (idx: number, blockId: string) => {
        const isAnswered = answers[blockId] !== undefined && answers[blockId] !== null && (Array.isArray(answers[blockId]) ? (answers[blockId] as any[]).length > 0 : answers[blockId] !== '');
        const isMarked = markedForReview.has(idx);
        const isVisited = visitedQuestions.has(idx);

        if (isAnswered && isMarked) return 'marked_answered';
        if (isAnswered) return 'answered';
        if (isMarked) return 'marked';
        if (isVisited && !isAnswered) return 'not_answered';
        return 'not_visited';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'answered': return 'bg-success text-success-foreground border-success';
            case 'not_answered': return 'bg-destructive text-destructive-foreground border-destructive';
            case 'marked': return 'bg-mark text-mark-foreground border-mark';
            case 'marked_answered': return 'bg-mark text-mark-foreground border-mark relative'; // needs dot
            default: return 'bg-background text-foreground border-border';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!test) return <div className="p-8 text-center bg-background text-foreground">Test not found</div>;

    // View for Completed Test
    if (test.status === 'COMPLETED') {
        return (
            <div className="container mx-auto p-8 max-w-2xl bg-background min-h-screen">
                 <div className="bg-card border rounded-lg p-8 text-center space-y-6 shadow-sm">
                     <div className="w-16 h-16 bg-secondary text-success rounded-full flex items-center justify-center mx-auto">
                         <CheckCircle className="w-8 h-8" />
                     </div>
                     <h1 className="text-3xl font-bold">Test Completed</h1>
                     <div className="text-4xl font-bold text-primary">
                         {test.score} / {test.totalMarks}
                     </div>
                     <p className="text-foreground/60">
                         You have completed this test.
                     </p>
                     
                     <div className="pt-6">
                         <Button onClick={() => navigate('/tests')}>Return to Dashboard</Button>
                     </div>
                 </div>
            </div>
        );
    }

    // Force Fullscreen Modal
    if (!isFullscreen) {
        return (
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border rounded-lg p-8 text-center space-y-4 shadow-lg">
                    <Maximize2 className="w-12 h-12 mx-auto text-primary" />
                    <h2 className="text-2xl font-bold">Full Screen Required</h2>
                    <p className="text-foreground/60">
                        This test must be taken in full-screen mode. Switching tabs or exiting full-screen will record a warning. 
                        <br/><strong className="text-destructive">3 warnings will automatically submit the test.</strong>
                    </p>
                    <Button onClick={enterFullscreen} className="w-full">
                        Enter Full Screen & Start
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/tests')} className="w-full">
                        Cancel & Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="p-8">Question not found</div>;
    const currentBlock = currentQuestion.blockSnapshot;

    // Calculate counts for sidebar
    const counts = {
        answered: 0,
        notAnswered: 0,
        notVisited: 0,
        marked: 0,
        markedAnswered: 0
    };
    
    test.questions.forEach((q, idx) => {
        const s = getQuestionStatus(idx, q.blockId);
        if (s === 'answered') counts.answered++;
        else if (s === 'not_answered') counts.notAnswered++;
        else if (s === 'marked') counts.marked++;
        else if (s === 'marked_answered') counts.markedAnswered++;
        else counts.notVisited++;
    });

    return (
        <div className="flex h-screen w-screen overflow-hidden flex-col bg-background font-sans text-foreground">
           {/* UI Header */}
           <div className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-20 sticky top-0">
              <div className="font-semibold text-sm md:text-base truncate max-w-[50%]">
                  {test.config?.questionCount || test.questions.length} Questions Test
              </div>
              <div className="flex items-center gap-4">
                  <div className="bg-muted/50 border border-border px-3 py-1.5 rounded text-sm font-mono font-medium">
                      Time Left <span className={cn("text-foreground bg-background px-1 rounded ml-1", timeLeft !== null && timeLeft < 300 && "text-destructive font-bold")}>
                        {timeLeft !== null ? formatTime(timeLeft) : "--:--:--"}
                      </span>
                  </div>
              </div>
           </div>
        
           {/* Body */}
           <div className="flex-1 flex overflow-hidden">
              {/* Main Content */}
              <div className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
                  {/* Question Header */}
                  <div className="h-12 border-b flex items-center justify-between px-6 bg-card/50 shrink-0">
                      <div className="font-bold text-lg">Question No. {currentQuestionIndex + 1}</div>
                  </div>
        
                  {/* Question Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        <ContentBlockDisplay 
                             block={currentBlock} 
                             isTest={true}
                             value={answers[currentBlock._id]} 
                             onChange={(val) => handleAnswerUpdate(currentBlock._id, val)}
                        /> 
                  </div>
        
                  {/* Footer Actions */}
                  <div className="h-16 border-t bg-card px-6 flex items-center justify-between shrink-0">
                       <div className="flex gap-2">
                           <Button variant="secondary" className="border shadow-sm" onClick={handleMarkForReview}>
                               Mark for Review & Next
                           </Button>
                           <Button variant="secondary" className="border shadow-sm" onClick={handleClearResponse}>
                               Clear Response
                           </Button>
                       </div>
                       <Button onClick={handleSaveAndNext} className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px]">
                           Save & Next
                       </Button>
                  </div>
              </div>
        
              {/* Sidebar */}
              <div className="w-[320px] bg-secondary/30 border-l flex flex-col shrink-0">
                  {/* User Profile */}
                  <div className="p-4 flex items-center gap-3 border-b bg-secondary/50">
                      <div>
                          <div className="font-semibold text-sm">{user?.name || 'Guest User'}</div>
                      </div>
                  </div>
        
                  {/* Legend */}
                  <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] border-b bg-background/50">
                      <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full flex items-center justify-center bg-success text-success-foreground text-[10px] font-bold">{counts.answered}</div> Answered</div>
                      <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold">{counts.notAnswered}</div> Not Answered</div>
                      <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full flex items-center justify-center bg-background border border-border text-foreground text-[10px] font-bold">{counts.notVisited}</div> Not Visited</div>
                      <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full flex items-center justify-center bg-mark text-mark-foreground text-[10px] font-bold">{counts.marked}</div> Marked for Review</div>
                      <div className="flex items-center gap-1.5 col-span-2"><div className="w-6 h-6 rounded-full flex items-center justify-center bg-mark text-mark-foreground text-[10px] font-bold relative"><div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border border-white"></div>{counts.markedAnswered}</div> Answered & Marked for Review</div>
                  </div>
        
                  {/* Grid */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                       <div className="p-2 bg-secondary/50 rounded font-semibold text-xs mb-3 text-secondary-foreground uppercase tracking-wide">
                           SECTION : Test
                       </div>
                       <div className="grid grid-cols-5 gap-2">
                           {test.questions.map((q, idx) => {
                               const status = getQuestionStatus(idx, q.blockId);
                               const colorClass = getStatusColor(status);
                               
                               return (
                                   <button 
                                       key={idx}
                                       onClick={() => changeQuestion(idx)}
                                       className={cn(
                                           "w-10 h-9 rounded text-xs font-semibold border transition-all relative flex items-center justify-center",
                                           colorClass,
                                           idx === currentQuestionIndex ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-80"
                                       )}
                                   >
                                       {idx + 1}
                                       {status === 'marked_answered' && (
                                           <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border border-background"></div>
                                       )}
                                   </button>
                               )
                           })}
                       </div>
                  </div>
        
                  {/* Bottom Actions */}
                  <div className="p-4 border-t bg-secondary/30 space-y-3">
                       <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm" onClick={() => handleSubmitTest()}>Submit Test</Button>
                  </div>
              </div>
           </div>
           
           {/* Warning Modal */}
            <Modal
                isOpen={showWarningModal}
                onClose={() => setShowWarningModal(false)}
                title="Focus Lost Warning"
                footer={<Button onClick={() => setShowWarningModal(false)}>I Understand</Button>}
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertTriangle className="w-8 h-8" />
                        <span className="font-bold text-lg">Warning {focusWarnings.length}/3</span>
                    </div>
                    <p>
                        You have navigated away from the test window or exited full-screen mode.
                        Please remain focused on the test.
                    </p>
                    <p className="font-semibold text-destructive">
                        Reaching 3 warnings will automatically submit your test.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
