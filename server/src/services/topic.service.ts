
import Topic, { type ITopic } from '../models/Topic.ts';
import { SubjectService } from './subject.service.ts';

export class TopicService {

  static async create(userId: string, data: Partial<ITopic>): Promise<ITopic> {
    if (!data.subjectId) {
      throw new Error('Subject ID is required');
    }
    const hasAccess = await SubjectService.checkOwnership(userId, data.subjectId.toString());
    if (!hasAccess) {
      throw new Error('Access denied to subject');
    }

    if (data.position === undefined) {
      const count = await Topic.countDocuments({ subjectId: data.subjectId });
      data.position = count;
    }

    const topic = new Topic(data);
    return await topic.save();
  }

  static async findAll(userId: string, subjectId: string): Promise<ITopic[]> {
    const hasAccess = await SubjectService.checkOwnership(userId, subjectId);
    if (!hasAccess) {
      throw new Error('Access denied to subject');
    }
    return await Topic.find({ subjectId }, '_id title subjectId position').sort({ position: 1, createdAt: 1 });
  }

  static async findOne(userId: string, topicId: string): Promise<ITopic | null> {
    const topic = await Topic.findById(topicId);
    if (!topic) return null;

    const hasAccess = await SubjectService.checkOwnership(userId, topic.subjectId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    return topic;
  }

  static async update(userId: string, topicId: string, data: Partial<ITopic>): Promise<ITopic | null> {
    const topic = await Topic.findById(topicId);
    if (!topic) return null;

    const hasAccess = await SubjectService.checkOwnership(userId, topic.subjectId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await Topic.findByIdAndUpdate(topicId, data, { new: true });
  }

  static async delete(userId: string, topicId: string): Promise<ITopic | null> {
    const topic = await Topic.findById(topicId);
    if (!topic) return null;

    const hasAccess = await SubjectService.checkOwnership(userId, topic.subjectId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await Topic.findByIdAndDelete(topicId);
  }

  static async checkOwnership(userId: string, topicId: string): Promise<boolean> {
    const topic = await Topic.findOne({ _id: topicId });
    if (!topic) return false;
    return await SubjectService.checkOwnership(userId, topic.subjectId.toString());
  }
}
