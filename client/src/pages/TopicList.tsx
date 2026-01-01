import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2, Play } from 'lucide-react';
import { type Topic } from '../types/domain';
import { useContentStore } from '../store/contentStore';
import { useTakeTest } from '../hooks/useTakeTest';


import { useSpaceStore } from '../store/spaceStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Tooltip } from '../components/common/Tooltip';
import { EmptyState } from '../components/common/EmptyState';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DynamicIcon, getDeterministicColor } from '../components/UI/DynamicIcon';
import { TruncatedText } from '../components/common/TruncatedText';

export default function TopicList() {
  const { spaceSlug, subjectSlug } = useParams();
  const navigate = useNavigate();

  // Stores

  const { currentSpace, fetchSpace } = useSpaceStore();
  const {
    currentSubject,
    // setCurrentSubject, // No longer manually setting from list
    fetchSubject,
    topics,
    isLoading,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    setCurrentTopic
  } = useContentStore();


  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTakeTestModalOpen, setIsTakeTestModalOpen] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [targetTopic, setTargetTopic] = useState<Topic | null>(null);
  const [targetTestTopic, setTargetTestTopic] = useState<Topic | null>(null);



  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({ title: '' });

  // Initial load
  useEffect(() => {
    if (spaceSlug && subjectSlug) {
      if (!currentSpace || currentSpace.slug !== spaceSlug) fetchSpace(spaceSlug);

      // Fetch specific subject directly
      if (!currentSubject || currentSubject.slug !== subjectSlug) {
        fetchSubject(subjectSlug);
      }

      fetchTopics(subjectSlug);
    }
  }, [spaceSlug, subjectSlug, fetchSpace, fetchSubject, fetchTopics, currentSpace, currentSubject]);


  const handleCreate = async () => {
    if (!subjectSlug) return;
    setIsCreating(true);
    try {
      await createTopic(subjectSlug, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!targetTopic) return;
    try {
      await updateTopic(targetTopic._id, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!targetTopic) return;
    try {
      await deleteTopic(targetTopic._id);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setFormData({ title: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetTopic(topic);
    setFormData({ title: topic.title });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetTopic(topic);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsTakeTestModalOpen(false);
    setTargetTopic(null);
    setTargetTestTopic(null);
  };

  const openTakeTestModal = (topic: Topic | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetTestTopic(topic);
    setIsTakeTestModalOpen(true);
  };

  const { startTest } = useTakeTest();

  const handleQuickTest = async (mode: 'pending' | 'all') => {
    if (!currentSpace || !currentSubject) return;

    setIsCreatingTest(true);
    try {
      await startTest({
        spaceId: currentSpace._id,
        subjectId: currentSubject._id,
        topicId: targetTestTopic?._id,
        mode
      });
      setIsTakeTestModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create test:', err);
      alert(err.response?.data?.message || "Failed to create test. Maybe no questions available?");
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleTopicClick = (topic: Topic) => {
    setCurrentTopic(topic);
    navigate(`/spaces/${spaceSlug}/${subjectSlug}/${topic.slug}`);
  };

  if (isLoading && topics.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceSlug}/library` },
            { label: currentSubject?.title || <div className="h-4 w-32 bg-muted animate-pulse rounded" /> }
          ]}
        />
      </div>

      <div className="flex items-center justify-between mb-8">
        <TruncatedText as="h1" className="text-3xl font-bold tracking-tight">
          {currentSubject?.title}
        </TruncatedText>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={(e) => openTakeTestModal(null, e)}>
            Take Test
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Topic
          </Button>
        </div>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          title="No topics yet"
          description="Create a topic to start adding content."
          action={<Button onClick={openCreateModal}>Add Topic</Button>}
        />
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <div
              key={topic._id}
              onClick={() => handleTopicClick(topic)}
              className="group flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`h-10 w-10 rounded-md flex items-center justify-center text-lg font-bold shrink-0 ${getDeterministicColor(topic._id)}`}>
                  <DynamicIcon name={topic.icon || 'Hash'} className="h-5 w-5" />
                </div>
                <TruncatedText as="h3" className="text-lg font-medium">
                  {topic.title}
                </TruncatedText>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip content="Take Test" delay={0}>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={(e) => openTakeTestModal(topic, e)}
                  >
                    <Play className="h-4 w-4 fill-current" />
                  </Button>
                </Tooltip>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => openEditModal(topic, e)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => openDeleteModal(topic, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Add New Topic"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Topic'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="e.g. Linear Equations"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Topic"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUpdate();
              }
            }}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        title="Delete Topic"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Topic'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{targetTopic?.title}"?
        </p>
      </Modal>

      <Modal
        isOpen={isTakeTestModalOpen}
        onClose={() => setIsTakeTestModalOpen(false)}
        title={targetTestTopic ? `Test: ${targetTestTopic.title}` : `Test: ${currentSubject?.title}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Start a quick test for <strong>{targetTestTopic?.title || currentSubject?.title}</strong>.
            This will create a 30-minute test with 15 questions (if available).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleQuickTest('pending')}
              disabled={isCreatingTest}
            >
              <span className="text-lg font-bold">Pending Q's</span>
              <span className="text-xs text-muted-foreground">Due for review</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleQuickTest('all')}
              disabled={isCreatingTest}
            >
              <span className="text-lg font-bold">All Q's</span>
              <span className="text-xs text-muted-foreground">Random mix</span>
            </Button>
          </div>

          {isCreatingTest && (
            <div className="flex items-center justify-center text-sm text-muted-foreground mt-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating test...
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
