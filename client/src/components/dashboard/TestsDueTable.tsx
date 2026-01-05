import React from 'react';
import type { TestUnit } from '../../types/dashboard';
import { CheckCircle, Clock, PauseCircle, PlayCircle, AlertCircle } from 'lucide-react';

interface TestsDueTableProps {
    tests: TestUnit[];
    onScroll?: () => void;
    onTakeTest: (test: TestUnit) => void;
}

const StatusBadge = ({ status }: { status: TestUnit['status'] }) => {
    switch (status) {
        case 'COMPLETE':
            return <div className="flex items-center gap-1 text-success"><CheckCircle size={16} /> Complete</div>;
        case 'READY':
            return <div className="flex items-center gap-1 text-warning"><Clock size={16} /> Due Soon</div>;
        case 'OVERDUE':
            return <div className="flex items-center gap-1 text-destructive"><AlertCircle size={16} /> Overdue</div>;
        case 'IN_PROGRESS':
            return <div className="flex items-center gap-1 text-primary"><PlayCircle size={16} /> In Progress</div>;
        case 'PAUSED':
            return <div className="flex items-center gap-1 text-warning"><PauseCircle size={16} /> Paused</div>;
        default:
            return null;
    }
};

export const TestsDueTable: React.FC<TestsDueTableProps> = ({ tests, onScroll, onTakeTest }) => {
    // const { startTest } = useTakeTest(); // Moved to parent

    const handleAction = async (test: TestUnit) => {
        if (test.dueQuestions === 0) {
            // If reviewing allowed, handle here or bubble up?
            // Since logic is separating, let's bubble everything and let parent decide?
            // Or just for taking test. Based on request, user wants to take test for total questions even if due is 0.
            // So we should bubble it up regardless.
            onTakeTest(test);
            return;
        }

        onTakeTest(test);
    };

    return (
        <div className="h-full w-full bg-background rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto" onScroll={onScroll}>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-muted-foreground font-medium border-b border-border">
                        <tr>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Space</th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Subject</th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Topic</th>
                            <th className="px-6 py-4 text-center sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Due Questions</th>
                            <th className="px-6 py-4 text-center sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Total Questions</th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Status</th>
                            <th className="px-6 py-4 text-center sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {(!tests || tests.length === 0) ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                    No tests due today! Great job.
                                </td>
                            </tr>
                        ) : (
                            tests.map((test, index) => {
                                if (!test || !test.topic || !test.space || !test.subject) return null;
                                return (
                                    <tr key={`${test.topic?._id || index}-${index}`} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {test.space.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">{test.subject.name}</td>
                                        <td className="px-6 py-4 text-foreground/80">{test.topic.name}</td>
                                        <td className="px-6 py-4 text-center font-bold text-destructive text-base">
                                            {test.dueQuestions}
                                        </td>
                                        <td className="px-6 py-4 text-center text-muted-foreground">
                                            {test.totalQuestions}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={test.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => handleAction(test)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 ${test.dueQuestions === 0
                                                        ? 'bg-muted text-muted-foreground cursor-not-allowed hidden' // Or muted/disabled
                                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                        }`}
                                                >
                                                    {test.space.name === 'Mains' ? 'Write' : (test.dueQuestions === 0 ? 'Review' : 'Take Test')}
                                                </button>

                                                {test.dueQuestions === 0 && (
                                                    <button
                                                        onClick={() => handleAction(test)}
                                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                                    >
                                                        Review
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
