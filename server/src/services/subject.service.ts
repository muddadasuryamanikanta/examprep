
import Subject, { type ISubject } from '../models/Subject.ts';
import { SpaceService } from './space.service.ts';

export class SubjectService {

  static async create(userId: string, data: Partial<ISubject>): Promise<ISubject> {
    if (!data.spaceId) {
      throw new Error('Space ID is required');
    }
    const hasAccess = await SpaceService.checkOwnership(userId, data.spaceId.toString());
    if (!hasAccess) {
      throw new Error('Access denied to space');
    }

    if (data.position === undefined) {
      const count = await Subject.countDocuments({ spaceId: data.spaceId });
      data.position = count;
    }

    const subject = new Subject(data);
    return await subject.save();
  }

  static async findAll(userId: string, spaceId: string): Promise<ISubject[]> {
    const hasAccess = await SpaceService.checkOwnership(userId, spaceId);
    if (!hasAccess) {
      throw new Error('Access denied to space');
    }
    return await Subject.find({ spaceId }, '_id title spaceId position').sort({ position: 1, createdAt: 1 });
  }

  static async findOne(userId: string, subjectId: string): Promise<ISubject | null> {
    const subject = await Subject.findById(subjectId);
    if (!subject) return null;

    const hasAccess = await SpaceService.checkOwnership(userId, subject.spaceId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    return subject;
  }

  static async update(userId: string, subjectId: string, data: Partial<ISubject>): Promise<ISubject | null> {
    const subject = await Subject.findById(subjectId);
    if (!subject) return null;

    const hasAccess = await SpaceService.checkOwnership(userId, subject.spaceId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await Subject.findByIdAndUpdate(subjectId, data, { new: true });
  }

  static async delete(userId: string, subjectId: string): Promise<ISubject | null> {
    const subject = await Subject.findById(subjectId);
    if (!subject) return null;

    const hasAccess = await SpaceService.checkOwnership(userId, subject.spaceId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await Subject.findByIdAndDelete(subjectId);
  }

  static async checkOwnership(userId: string, subjectId: string): Promise<boolean> {
    const subject = await Subject.findOne({ _id: subjectId });
    if (!subject) return false;
    return await SpaceService.checkOwnership(userId, subject.spaceId.toString());
  }
}
