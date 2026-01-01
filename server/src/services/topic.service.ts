import Topic, { type ITopic } from '../models/Topic.ts';
import Subject from '../models/Subject.ts';
import { SubjectService } from './subject.service.ts';
import { Types } from 'mongoose';
import { generateIconForSubject } from '../utils/common.ts';

export class TopicService {

  static async create(userId: string, data: Partial<ITopic>): Promise<ITopic> {
    if (!data.subjectId) {
      throw new Error('Subject ID is required');
    }

    // Resolve subject slug to ID if necessary
    let subjectId = data.subjectId.toString();
    if (!Types.ObjectId.isValid(subjectId)) {
      const subject = await SubjectService.findOne(userId, subjectId);
      if (!subject) throw new Error('Subject not found');
      subjectId = (subject._id as any).toString();
    }

    const hasAccess = await SubjectService.checkOwnership(userId, subjectId);
    if (!hasAccess) {
      throw new Error('Access denied to subject');
    }

    if (data.position === undefined) {
      const count = await Topic.countDocuments({ subjectId: subjectId });
      data.position = count;
    }

    if (!data.icon && data.title) {
        data.icon = await generateIconForSubject(data.title);
    }

    const topic = new Topic({ ...data, subjectId: subjectId });
    const savedTopic = await topic.save();
    await Subject.findByIdAndUpdate(subjectId, { $inc: { topicCount: 1 } });
    return savedTopic;
  }

  static async findAll(userId: string, subjectIdentifier: string): Promise<ITopic[]> {
    const subject = await SubjectService.findOne(userId, subjectIdentifier);
    if (!subject) {
      throw new Error('Access denied or Subject not found');
    }
    return await Topic.find({ subjectId: subject._id }, '_id title subjectId position slug icon').sort({ position: 1, createdAt: 1 });
  }

  static async findOne(userId: string, identifier: string): Promise<ITopic | null> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };
    const topic = await Topic.findOne(query);
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
