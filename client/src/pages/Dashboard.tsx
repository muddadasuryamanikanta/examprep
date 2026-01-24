import { useEffect, useState } from 'react';
import { TestsDueTable } from '@/components/dashboard/TestsDueTable';
import { MultiSelect } from '@/components/UI/MultiSelect';
import type { TestUnit } from '@/types/dashboard';
import api from '@/lib/api';
import { Modal } from '@/components/common/Modal';
import { useTakeTest } from '@/hooks/useTakeTest';
import { Loader2, PlayCircle, Clock } from 'lucide-react';

const Dashboard = () => {
    const [tests, setTests] = useState<TestUnit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Test Selection Modal State
    const [selectedTestUnit, setSelectedTestUnit] = useState<TestUnit | null>(null);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const { startTest, isLoading: isStartingTest } = useTakeTest();

    // Filter State
    const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

    // Options State (for dynamic fetching)
    const [spaceOptions, setSpaceOptions] = useState<{ id: string; label: string }[]>([]);
    const [subjectOptions, setSubjectOptions] = useState<{ id: string; label: string }[]>([]);
    const [topicOptions, setTopicOptions] = useState<{ id: string; label: string }[]>([]);

    // 1. Fetch Space Options on Mount
    useEffect(() => {
        const fetchSpaces = async () => {
            try {
                const res = await api.get('/spaces');
                // Assuming res.data is array of Spaces
                setSpaceOptions(res.data.map((s: any) => ({ id: s._id, label: s.name || s.title })));
            } catch (err) {
                console.error('Failed to fetch spaces', err);
            }
        };
        fetchSpaces();
    }, []);

    // 2. Fetch Subject Options when Space Selection Changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (selectedSpaceIds.length === 0) {
                setSubjectOptions([]);
                return;
            }
            try {
                // Fetch subjects for each selected space
                const requests = selectedSpaceIds.map(id => api.get(`/spaces/${id}/subjects`));
                const responses = await Promise.all(requests);
                const allSubjects = responses.flatMap(r => r.data);
                // Dedup by ID
                const uniqueSubjects = Array.from(new Map(allSubjects.map((s: any) => [s._id, s])).values());
                setSubjectOptions(uniqueSubjects.map((s: any) => ({ id: s._id, label: s.name || s.title })));
            } catch (err) {
                console.error('Failed to fetch subjects', err);
            }
        };
        fetchSubjects();
    }, [selectedSpaceIds]);

    // 3. Fetch Topic Options when Subject Selection Changes
    useEffect(() => {
        const fetchTopics = async () => {
            if (selectedSubjectIds.length === 0) {
                setTopicOptions([]);
                return;
            }
            try {
                const requests = selectedSubjectIds.map(id => api.get(`/subjects/${id}/topics`));
                const responses = await Promise.all(requests);
                const allTopics = responses.flatMap(r => r.data);
                const uniqueTopics = Array.from(new Map(allTopics.map((t: any) => [t._id, t])).values());
                setTopicOptions(uniqueTopics.map((t: any) => ({ id: t._id, label: t.name || t.title })));
            } catch (err) {
                console.error('Failed to fetch topics', err);
            }
        };
        fetchTopics();
    }, [selectedSubjectIds]);


    // 4. Fetch Tests (Data)
    const fetchTests = async (pageNum: number, isNewFilter: boolean = false) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const params = new URLSearchParams();
            params.append('page', pageNum.toString());
            params.append('limit', '50'); // 50 items per page

            selectedSpaceIds.forEach(id => params.append('spaceIds', id));
            selectedSubjectIds.forEach(id => params.append('subjectIds', id));
            selectedTopicIds.forEach(id => params.append('topicIds', id));

            const response = await api.get(`/dashboard/tests-due-today?${params.toString()}`);

            // Handle both new paginated response { data: [], meta: {} } and legacy array response []
            let data: TestUnit[] = [];


            if (Array.isArray(response.data)) {
                data = response.data;
                // total = data.length;
            } else if (response.data && Array.isArray(response.data.data)) {
                data = response.data.data;
                // total = response.data.meta?.total || 0;
            }

            if (isNewFilter) {
                setTests(data);
            } else {
                setTests(prev => [...prev, ...data]);
            }

            setHasMore(data.length === 50); // Or check if tests.length < total
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Trigger Fetch on Filter Change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchTests(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSpaceIds, selectedSubjectIds, selectedTopicIds]);

    // Handle Infinite Scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Load more if filtered to bottom (threshold 50px)
        if (scrollTop + clientHeight >= scrollHeight - 50 && hasMore && !isLoading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchTests(nextPage, false);
        }
    };

    const formatDate = () => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleTakeTest = (test: TestUnit) => {
        setSelectedTestUnit(test);
        setIsSelectionModalOpen(true);
    };

    const handleConfirmTest = async (mode: 'pending' | 'all') => {
        if (!selectedTestUnit) return;

        try {
            await startTest({
                spaceId: selectedTestUnit.space._id,
                subjectId: selectedTestUnit.subject._id,
                topicId: selectedTestUnit.topic._id,
                mode: mode
            });
            setIsSelectionModalOpen(false);
            setSelectedTestUnit(null);
        } catch (error) {
            // Error managed in hook/store (PromptService) usually
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full p-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 flex-none">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Tests Due Today</h1>
                    <p className="mt-1 text-muted-foreground">
                        {formatDate()}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <MultiSelect
                        options={spaceOptions}
                        selected={selectedSpaceIds}
                        onChange={setSelectedSpaceIds}
                        placeholder="Filter Spaces"
                        className="w-48"
                    />
                    <MultiSelect
                        options={subjectOptions}
                        selected={selectedSubjectIds}
                        onChange={setSelectedSubjectIds}
                        placeholder="Filter Subjects"
                        className="w-48"
                    />
                    <MultiSelect
                        options={topicOptions}
                        selected={selectedTopicIds}
                        onChange={setSelectedTopicIds}
                        placeholder="Filter Topics"
                        className="w-48"
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div
                    className="flex-1 min-h-0 bg-background rounded-xl border border-border shadow-sm flex flex-col overflow-hidden"
                >
                    <TestsDueTable
                        tests={tests}
                        onScroll={handleScroll as any}
                        onTakeTest={handleTakeTest}
                    />
                    {isLoading && (
                        <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20">
                            Loading more...
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center gap-6 text-xs text-muted-foreground flex-none">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-destructive"></span> Overdue
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning"></span> Due Soon
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success"></span> Complete
                    </div>
                </div>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground italic flex-none">
                "Success is the sum of small efforts, repeated day in and day out."
            </div>

            {/* Test Selection Modal */}
            <Modal
                isOpen={isSelectionModalOpen}
                onClose={() => setIsSelectionModalOpen(false)}
                title={`Start Test: ${selectedTestUnit?.topic.name}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Select a mode for your practice session.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleConfirmTest('pending')}
                            disabled={isStartingTest || (selectedTestUnit?.dueQuestions || 0) === 0}
                            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 transition-all ${(selectedTestUnit?.dueQuestions || 0) === 0
                                ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed opacity-50'
                                : 'bg-background border-primary/20 hover:border-primary hover:bg-primary/5 text-foreground'
                                }`}
                        >
                            <Clock className="w-6 h-6 text-warning" />
                            <div className="text-center">
                                <span className="block font-bold mt-1">Practice Due</span>
                                <span className="text-xs text-muted-foreground">
                                    {selectedTestUnit?.dueQuestions || 0} Questions
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => handleConfirmTest('all')}
                            disabled={isStartingTest}
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 bg-background border-primary/20 hover:border-primary hover:bg-primary/5 text-foreground transition-all"
                        >
                            <PlayCircle className="w-6 h-6 text-primary" />
                            <div className="text-center">
                                <span className="block font-bold mt-1">Practice All</span>
                                <span className="text-xs text-muted-foreground">
                                    {selectedTestUnit?.totalQuestions || 0} Questions
                                </span>
                            </div>
                        </button>
                    </div>

                    {isStartingTest && (
                        <div className="flex items-center justify-center text-sm text-primary animate-pulse mt-4">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Starting test...
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
