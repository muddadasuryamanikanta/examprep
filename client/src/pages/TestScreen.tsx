import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Maximize2, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/common/Button';
import { ContentBlockDisplay } from '../components/content-blocks/ContentBlockDisplay';
import { Modal } from '../components/common/Modal';

// Simplified types for the test
interface TestQuestion {
    blockId: string;
    blockSnapshot: any; // Full content block
    userAnswer: any;
}

interface Test {
    _id: string;
    status: string;
    questions: TestQuestion[];
    config: {
        questionCount: number;
    };
    totalMarks: number;
    score: number;
    warnings: any[];
}

export default function TestScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Focus tracking
    const [focusWarnings, setFocusWarnings] = useState<{timestamp: Date, reason: string}[]>([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const focusLossCountRef = useRef(0);

    // Initial fetch
    useEffect(() => {
        const fetchTest = async () => {
            try {
                const res = await api.get(`/tests/${id}`);
                setTest(res.data);
                // Pre-fill answers if any (resuming)
                const existingAnswers: Record<string, any> = {};
                res.data.questions.forEach((q: TestQuestion) => {
                    if (q.userAnswer) existingAnswers[q.blockId] = q.userAnswer;
                });
                setAnswers(existingAnswers);
                
                // If test is completed, redirect to results or show results mode?
                // For now, if completed, just show results static view (to be implemented or reused)
                // Actually the API returns it, we can just show score.
            } catch (err) {
                console.error(err);
                // navigate('/tests');
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [id]);

    // Full screen enforcement & Focus tracking
    useEffect(() => {
        if (!test || test.status === 'COMPLETED') return;

        const handleFocusLoss = () => {
             // If we are not in full screen, that might be okay if we haven't started enforcing yet?
             // But requirement says "full screen mode only".
             // Also "switch tabs or click outside".
             
             // We'll use visibilitychange and blur
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
    }, [test]);

    const registerWarning = (reason: string) => {
        if (submitting) return; // Don't warn if already submitting
        
        const now = new Date();
        // Debounce warnings slightly?
        // Add to state
        setFocusWarnings(prev => {
            // Check if last warning was very recent (e.g. < 2 sec) to avoid double counting blur+visibility
            if (prev.length > 0) {
                const last = new Date(prev[prev.length - 1].timestamp).getTime();
                if (now.getTime() - last < 2000) return prev;
            }
            
            const newWarnings = [...prev, { timestamp: now, reason }];
            focusLossCountRef.current = newWarnings.length;
            
            // 3 strikes rule
            if (newWarnings.length >= 3) {
                // Auto submit
                handleSubmitTest(newWarnings);
            } else {
                setShowWarningModal(true);
            }
            
            return newWarnings;
        });
    };

    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
            alert("Full screen mode is required for this test.");
        }
    };

    const handleSubmitTest = async (finalWarnings = focusWarnings) => {
        if (submitting) return;
        setSubmitting(true);
        
        try {
            await api.post(`/tests/${id}/submit`, {
                answers,
                warnings: finalWarnings
            });
            // Reload to show results
            window.location.reload();
        } catch (err) {
            console.error(err);
            setSubmitting(false);
            alert("Failed to submit test. Please try again.");
        }
    };

    const handleAnswerUpdate = (blockId: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [blockId]: value
        }));
        // Optionally save progress debounced
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!test) return <div className="p-8 text-center">Test not found</div>;

    // View for Completed Test
    if (test.status === 'COMPLETED') {
        return (
            <div className="container mx-auto p-8 max-w-2xl">
                 <div className="bg-background border rounded-lg p-8 text-center space-y-6">
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

    // View for Active Test
    
    // Force Fullscreen Modal
    if (!isFullscreen && test.status !== 'COMPLETED') {
        return (
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-background border rounded-lg p-8 text-center space-y-4 shadow-lg">
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
    const isFirst = currentQuestionIndex === 0;
    const isLast = currentQuestionIndex === test.questions.length - 1;

    // Inject handlers into ContentBlockDisplay? 
    // ContentBlockDisplay renders the block. We need to pass down the "onChange" handler.
    // However, ContentBlockDisplay usually renders static content or interactive content if customized.
    // The existing McqBlock/etc might take `onAnswer` prop or similar?
    // Let's check ContentBlockDisplay again. It passes `block` prop.
    // If existing blocks are read-only, I might need to wrap them or modify them to accept interactive props?
    // Or I can just render the inputs here if `ContentBlockDisplay` is just for "Displaying" the content/question text.
    
    // Wait, the existing blocks (McqBlock) seem to handle user interaction? 
    // I should check McqBlock functionality.
    
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="border-b bg-background p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="font-semibold">
                    Question {currentQuestionIndex + 1} of {test.questions.length}
                </div>
                <div className="flex items-center gap-4">
                     <div className={`flex items-center gap-2 text-sm font-medium ${focusWarnings.length > 0 ? 'text-destructive' : 'text-foreground/60'}`}>
                         <AlertTriangle className="w-4 h-4" />
                         Warnings: {focusWarnings.length}/3
                     </div>
                     <div className="h-6 w-px bg-border" />
                     {/* Timer could go here */}
                     <Button variant="destructive" size="sm" onClick={() => handleSubmitTest()}>Finish Test</Button>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 container mx-auto p-4 max-w-4xl flex flex-col justify-center">
                 <div className="space-y-6">
                     {/* We need to pass onChange to the block. 
                         If existing blocks don't support it, we might need a wrapper context or modify them.
                         For now, assuming I can pass extra props or context.
                         Actually ContentBlockDisplay just takes `block`.
                         I should probably modify ContentBlockDisplay to accept `value` and `onChange`.
                         
                         BUT, looking at previous conversation, `McqBlock` was refactored.
                         Let's assume for this MVP, I will render the question text via ContentBlockDisplay 
                         and then render my own input controls below it if the block is "interactive" 
                         OR I modify ContentBlockDisplay.
                         
                         Actually, `ContentBlockDisplay` switches on type. 
                         If I want to reuse logic, I should check `McqBlock` signature.
                         
                         Let's assume I can hack it by cloning element or modifying props? No.
                         
                         Preferred: Modify `ContentBlockDisplay` to accept `mode="test"` and `value`/`onChange`.
                         
                         For now, I'll pass a modified block object? No, that's messy.
                         
                         Let's just render the `McqBlock` directly here if it's MCQ.
                      */}
                      
                      {/* Temporary Solution: Render question using ContentBlockDisplay, but we need to capture input. 
                          I will modify the block object to include the current answer if the component supports it?
                          Or better, look at the block components.
                      */}

                      <div className="bg-background border rounded-xl p-8 shadow-sm">
                         {/* 
                            We simply render the internal components directly here to pass props,
                            since ContentBlockDisplay doesn't pass through extra props easily.
                         */}
                         {(() => {
                             const block = currentQuestion.blockSnapshot;
                             // We render ContentBlockDisplay for the question visual
                             return (
                                 <ContentBlockDisplay block={block} /> 
                             );
                             // Wait, if I just render ContentBlockDisplay, I can't capture input.
                             // I need to implement inputs for the test.
                         })()}
                         
                         {/* 
                            Since I haven't inspected McqBlock deeply for props, 
                            I'll add a simple input section below the question display for now,
                            OR I will replace ContentBlockDisplay with specific logic here.
                          */}
                          
                          <div className="mt-8 pt-8 border-t">
                              <h3 className="font-semibold mb-4">Your Answer</h3>
                              {(() => {
                                  const block = currentQuestion.blockSnapshot;
                                  const kind = block.kind;
                                  const currentAns = answers[block._id];

                                  if (kind === 'single_select_mcq') {
                                      return (
                                          <div className="space-y-3">
                                              {block.options?.map((opt: any) => (
                                                  <label key={opt.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${currentAns === opt.id ? 'border-primary bg-secondary' : 'hover:bg-secondary/50'}`}>
                                                      <input 
                                                          type="radio" 
                                                          name={block._id} 
                                                          value={opt.id}
                                                          checked={currentAns === opt.id}
                                                          onChange={() => handleAnswerUpdate(block._id, opt.id)}
                                                          className="w-4 h-4 text-primary"
                                                      />
                                                      <span className="ml-3">{opt.text}</span>
                                                  </label>
                                              ))}
                                          </div>
                                      );
                                  }
                                  
                                  if (kind === 'multi_select_mcq') {
                                       return (
                                          <div className="space-y-3">
                                              {block.options?.map((opt: any) => {
                                                  const isSelected = (currentAns || []).includes(opt.id);
                                                  return (
                                                    <label key={opt.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-primary bg-secondary' : 'hover:bg-secondary/50'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                const prev = currentAns || [];
                                                                if (e.target.checked) {
                                                                    handleAnswerUpdate(block._id, [...prev, opt.id]);
                                                                } else {
                                                                    handleAnswerUpdate(block._id, prev.filter((id: string) => id !== opt.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-primary rounded"
                                                        />
                                                        <span className="ml-3">{opt.text}</span>
                                                    </label>
                                                  );
                                              })}
                                          </div>
                                      );
                                  }

                                  if (kind === 'descriptive') {
                                      return (
                                          <textarea 
                                              className="w-full min-h-[150px] p-3 border rounded-md"
                                              placeholder="Type your answer here..."
                                              value={currentAns || ''}
                                              onChange={(e) => handleAnswerUpdate(block._id, e.target.value)}
                                          />
                                      );
                                  }

                                  return <p className="text-foreground/60">This question type does not require an answer or is not supported.</p>;
                              })()}
                          </div>
                     </div>
                 </div>
            </div>

            {/* Navigation Footer */}
            <div className="bg-background border-t p-4">
                <div className="container mx-auto max-w-4xl flex justify-between items-center">
                    <Button 
                        variant="outline" 
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={isFirst}
                    >
                        Previous
                    </Button>
                    
                    <div className="flex gap-1">
                        {test.questions.map((q, idx) => (
                            <div 
                                key={idx} 
                                className={`w-2 h-2 rounded-full ${idx === currentQuestionIndex ? 'bg-primary' : answers[q.blockId] ? 'bg-secondary' : 'bg-accent'}`} 
                            />
                        ))}
                    </div>

                    {isLast ? (
                        <Button onClick={() => handleSubmitTest()}>Submit Test</Button>
                    ) : (
                        <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}>
                            Next
                        </Button>
                    )}
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
