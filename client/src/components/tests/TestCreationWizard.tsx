import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

// Types
interface Space { _id: string; name: string; slug: string; }
interface Subject { _id: string; title: string; slug: string; spaceId: string; }
interface Topic { _id: string; title: string; slug: string; subjectId: string; }

// Steps
const Step = {
  SELECT_SPACE: 0,
  SELECT_SUBJECTS: 1,
  SELECT_TOPICS: 2,
  CONFIGURE: 3
} as const;

type Step = typeof Step[keyof typeof Step];

export default function TestCreationWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(Step.SELECT_SPACE);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Selection State
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  
  // Configuration State
  const [questionTypes, setQuestionTypes] = useState<string[]>(['single_select_mcq', 'multi_select_mcq', 'descriptive', 'note']);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [availableCounts, setAvailableCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);

  // Fetch Spaces on mount
  useEffect(() => {
    const fetchSpaces = async () => {
      setLoading(true);
      try {
        const res = await api.get('/spaces');
        setSpaces(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSpaces();
  }, []);

  // Fetch Subjects when Space selected
  useEffect(() => {
    if (!selectedSpace) return;
    const fetchSubjects = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/spaces/${selectedSpace.slug}/subjects`);
        setSubjects(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedSpace]);

  // Fetch Topics when Subjects selected
  useEffect(() => {
    if (selectedSubjectIds.length === 0) {
        setTopics([]);
        return;
    }
    
    // We need to fetch topics for all selected subjects. 
    // The current API might not support batch subject fetch well, so we might loop or need a new endpoint.
    // Assuming we can fetch by subject slug or ID. 
    // Let's assume we iterate for now or filtering client side if we had them (we don't).
    // Actually, common pattern: get topics for current space/subject. 
    // Since we select multiple subjects, we should probably fetch all topics for those subjects.
    
    const fetchTopics = async () => {
        setLoading(true);
        try {
            // Promise.all to fetch topics for each selected subject
            // Optimization: API endpoint to fetch topics by subject IDs would be better.
            // For now, let's just loop.
            const selectedSubjects = subjects.filter(s => selectedSubjectIds.includes(s._id));
            const promises = selectedSubjects.map(s => api.get(`/spaces/${selectedSpace?.slug}/${s.slug}/topics`));
            const results = await Promise.all(promises);
            const allTopics = results.flatMap(r => r.data);
            setTopics(allTopics);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    fetchTopics();
  }, [selectedSubjectIds, subjects, selectedSpace]);

  // Fetch Available Counts when entering Configure step
  useEffect(() => {
      if (currentStep === Step.CONFIGURE && selectedTopicIds.length > 0) {
          const fetchCounts = async () => {
              try {
                  const res = await api.post('/tests/count', { topicIds: selectedTopicIds });
                  setAvailableCounts(res.data);
                  
                  // Adjust max question count
                  const total = Object.values(res.data as Record<string, number>).reduce((a, b) => a + b, 0);
                  if (questionCount > total) setQuestionCount(total);
              } catch (err) {
                  console.error(err);
              }
          };
          fetchCounts();
      }
  }, [currentStep, selectedTopicIds]);


  const handleCreateTest = async () => {
      setCreating(true);
      try {
          // If no specific types selected, default to all relevant ones having questions
          const validTypes = questionTypes.length > 0 ? questionTypes : Object.keys(availableCounts);
          
          const config = {
              spaceId: selectedSpace?._id,
              subjectIds: selectedSubjectIds,
              topicIds: selectedTopicIds,
              questionTypes: validTypes,
              questionCount
          };

          const res = await api.post('/tests', config);
          navigate(`/tests/${res.data._id}`);
      } catch (err) {
          console.error(err);
          alert('Failed to create test. Please check availability.');
      } finally {
          setCreating(false);
      }
  };

  // Render Helpers
  const renderSpaceSelection = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map(space => (
              <Card 
                  key={space._id} 
                  className={`cursor-pointer transition-all hover:border-primary p-6 ${selectedSpace?._id === space._id ? 'border-primary ring-1 ring-primary' : ''}`}
                  onClick={() => setSelectedSpace(space)}
              >
                  <h3 className="font-semibold text-lg">{space.name}</h3>
                  <p className="text-sm text-foreground/60">{space.slug}</p>
              </Card>
          ))}
      </div>
  );

  const renderSubjectSelection = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => (
              <Card 
                  key={subject._id} 
                  className={`cursor-pointer transition-all hover:border-primary p-6 flex justify-between items-center ${selectedSubjectIds.includes(subject._id) ? 'border-primary ring-1 ring-primary' : ''}`}
                  onClick={() => {
                      if (selectedSubjectIds.includes(subject._id)) {
                          setSelectedSubjectIds(prev => prev.filter(id => id !== subject._id));
                      } else {
                          setSelectedSubjectIds(prev => [...prev, subject._id]);
                      }
                  }}
              >
                  <span className="font-semibold">{subject.title}</span>
                  {selectedSubjectIds.includes(subject._id) && <Check className="w-5 h-5 text-primary" />}
              </Card>
          ))}
      </div>
  );

  const renderTopicSelection = () => {
    // Group topics by subject for better UX
    const topicsBySubject: Record<string, Topic[]> = {};
    topics.forEach(t => {
        if (!topicsBySubject[t.subjectId]) topicsBySubject[t.subjectId] = [];
        topicsBySubject[t.subjectId].push(t);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedTopicIds(topics.map(t => t._id))}>Select All</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedTopicIds([])}>Select None</Button>
            </div>
            
            {Object.entries(topicsBySubject).map(([subjectId, subjectTopics]) => {
                const subject = subjects.find(s => s._id === subjectId);
                return (
                    <div key={subjectId} className="space-y-3">
                        <h3 className="font-semibold text-foreground/60 uppercase text-sm tracking-wider">{subject?.title || 'Unknown Subject'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {subjectTopics.map(topic => (
                                <Card 
                                    key={topic._id} 
                                    className={`cursor-pointer transition-all hover:border-primary p-4 flex justify-between items-center ${selectedTopicIds.includes(topic._id) ? 'border-primary ring-1 ring-primary' : ''}`}
                                    onClick={() => {
                                        if (selectedTopicIds.includes(topic._id)) {
                                            setSelectedTopicIds(prev => prev.filter(id => id !== topic._id));
                                        } else {
                                            setSelectedTopicIds(prev => [...prev, topic._id]);
                                        }
                                    }}
                                >
                                    <span className="text-sm font-medium">{topic.title}</span>
                                    {selectedTopicIds.includes(topic._id) && <Check className="w-4 h-4 text-primary" />}
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const renderConfiguration = () => {
      const totalAvailable = Object.values(availableCounts).reduce((a, b) => a + b, 0);

      return (
          <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-background border rounded-lg p-6">
                  <h3 className="font-semibold mb-4 text-lg">Question Types</h3>
                  <div className="space-y-3">
                      {Object.keys(availableCounts).length > 0 ? Object.entries(availableCounts).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between p-3 border rounded hover:bg-secondary/50 cursor-pointer"
                               onClick={() => {
                                   if (questionTypes.includes(type)) {
                                       setQuestionTypes(prev => prev.filter(t => t !== type));
                                   } else {
                                       setQuestionTypes(prev => [...prev, type]);
                                   }
                               }}
                          >
                               <div className="flex items-center gap-3">
                                   <div className={`w-5 h-5 rounded border flex items-center justify-center ${questionTypes.includes(type) ? 'bg-primary border-primary text-background' : 'border-input'}`}>
                                       {questionTypes.includes(type) && <Check className="w-3.5 h-3.5" />}
                                   </div>
                                   <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                               </div>
                               <span className="text-sm text-foreground/60">{count} available</span>
                          </div>
                      )) : <p className="text-foreground/60 italic">No questions found for selected topics.</p>}
                  </div>
              </div>

              <div className="bg-background border rounded-lg p-6">
                  <h3 className="font-semibold mb-4 text-lg">Number of Questions</h3>
                  <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                          <span>Quantity</span>
                          <span className="font-mono font-bold">{questionCount}</span>
                      </div>
                      <input 
                          type="range" 
                          min="1" 
                          max={Math.min(50, totalAvailable)} 
                          value={questionCount} 
                          onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                          className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-xs text-foreground/60 text-center">
                          Max available: {totalAvailable}
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  // Main Render
  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
             <h1 className="text-2xl font-bold">Create New Test</h1>
             <p className="text-foreground/60">Follow the steps to configure your practice test</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 max-w-3xl mx-auto relative">
             <div className="absolute left-0 top-1/2 w-full h-0.5 bg-secondary -z-10" />
             {['Select Space', 'Select Chapters', 'Select Topics', 'Configure'].map((label, idx) => (
                 <div key={idx} className="flex flex-col items-center gap-2 bg-background px-2">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                         currentStep > idx ? 'bg-success text-success-foreground' : 
                         currentStep === idx ? 'bg-primary text-background' : 
                         'bg-secondary text-foreground/60'
                     }`}>
                         {currentStep > idx ? <Check className="w-4 h-4" /> : idx + 1}
                     </div>
                     <span className={`text-xs font-medium ${currentStep === idx ? 'text-primary' : 'text-foreground/60'}`}>{label}</span>
                 </div>
             ))}
        </div>

        {/* Content */}
        <div className="min-h-[400px] mb-8">
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {currentStep === Step.SELECT_SPACE && renderSpaceSelection()}
                    {currentStep === Step.SELECT_SUBJECTS && renderSubjectSelection()}
                    {currentStep === Step.SELECT_TOPICS && renderTopicSelection()}
                    {currentStep === Step.CONFIGURE && renderConfiguration()}
                </>
            )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-8 border-t">
            <Button 
                variant="outline" 
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1) as Step)}
                disabled={currentStep === 0}
            >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            
            {currentStep < Step.CONFIGURE ? (
                <Button 
                    onClick={() => setCurrentStep(prev => Math.min(3, prev + 1) as Step)}
                    disabled={
                        (currentStep === Step.SELECT_SPACE && !selectedSpace) ||
                        (currentStep === Step.SELECT_SUBJECTS && selectedSubjectIds.length === 0) ||
                        (currentStep === Step.SELECT_TOPICS && selectedTopicIds.length === 0)
                    }
                >
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            ) : (
                <Button 
                    onClick={handleCreateTest} 
                    disabled={creating || Object.values(availableCounts).reduce((a, b) => a + b, 0) === 0}
                >
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Start Test'}
                </Button>
            )}
        </div>
    </div>
  );
}
