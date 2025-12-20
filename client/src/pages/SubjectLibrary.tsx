import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { type Subject } from '../types/domain';
import { useContentStore } from '../store/contentStore';
import { useSpaceStore } from '../store/spaceStore';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

export default function SubjectLibrary() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  
  // Stores
  const { currentSpace, fetchSpace } = useSpaceStore();
  const { subjects, isLoading, fetchSubjects, createSubject, updateSubject, deleteSubject, setCurrentSubject } = useContentStore();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetSubject, setTargetSubject] = useState<Subject | null>(null);
  
  const [formData, setFormData] = useState({ title: '' });

  useEffect(() => {
    if (spaceId) {
      fetchSpace(spaceId);
      fetchSubjects(spaceId);
    }
  }, [spaceId, fetchSpace, fetchSubjects]);

  const handleCreate = async () => {
    if (!spaceId) return;
    try {
      await createSubject(spaceId, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!targetSubject) return;
    try {
      await updateSubject(targetSubject._id, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!targetSubject) return;
    try {
      await deleteSubject(targetSubject._id);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setFormData({ title: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetSubject(subject);
    setFormData({ title: subject.title });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetSubject(subject);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setTargetSubject(null);
  };

  const handleSubjectClick = (subject: Subject) => {
    setCurrentSubject(subject);
    navigate(`/spaces/${spaceId}/${subject._id}`);
  };

  if (isLoading && subjects.length === 0) {
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
            { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" /> }
          ]}
        />
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{currentSpace?.name} Library</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create a subject to start adding topics."
          action={<Button onClick={openCreateModal}>Add Subject</Button>}
        />
      ) : (
        <div className="space-y-4">
          {subjects.map((subject) => (
            <div
              key={subject._id}
              onClick={() => handleSubjectClick(subject)}
              className="group flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {subject.title.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-lg font-medium">{subject.title}</h3>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => openEditModal(subject, e)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => openDeleteModal(subject, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal Reuse structure */}
       <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Add New Subject"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Subject'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="e.g. Algebra"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Subject"
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
        title="Delete Subject"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
               {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Subject'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{targetSubject?.title}"?
        </p>
      </Modal>
    </div>
  );
}
