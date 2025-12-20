import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { type Topic } from '../types/domain';
import { useContentStore } from '../store/contentStore';
import { useSpaceStore } from '../store/spaceStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

export default function TopicList() {
  const { spaceId, subjectId } = useParams();
  const navigate = useNavigate();
  
  // Stores
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
  const [targetTopic, setTargetTopic] = useState<Topic | null>(null);
  
  const [formData, setFormData] = useState({ title: '' });

  // Initial load
  useEffect(() => {
    if (spaceId && subjectId) {
      if (!currentSpace || currentSpace._id !== spaceId) fetchSpace(spaceId);
      
      // Fetch specific subject directly
      if (!currentSubject || currentSubject._id !== subjectId) {
          fetchSubject(subjectId);
      }
      
      fetchTopics(subjectId);
    }
  }, [spaceId, subjectId, fetchSpace, fetchSubject, fetchTopics, currentSpace, currentSubject]);


  const handleCreate = async () => {
    if (!subjectId) return;
    try {
      await createTopic(subjectId, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
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
    setTargetTopic(null);
  };
  
  const handleTopicClick = (topic: Topic) => {
    setCurrentTopic(topic);
    navigate(`/spaces/${spaceId}/${subjectId}/${topic._id}`);
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
            { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceId}/library` },
            { label: currentSubject?.title || <div className="h-4 w-32 bg-muted animate-pulse rounded" /> }
          ]}
        />
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{currentSubject?.title}</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
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
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                  #
                </div>
                <h3 className="text-lg font-medium">{topic.title}</h3>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Topic'}
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
    </div>
  );
}
