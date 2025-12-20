import Subject, { type ISubject } from '../models/Subject.ts';
import { SpaceService } from './space.service.ts';
import { Types } from 'mongoose';

export class SubjectService {

  static async create(userId: string, data: Partial<ISubject>): Promise<ISubject> {
    if (!data.spaceId) {
      throw new Error('Space ID is required');
    }

    // Resolve space slug to ID if necessary
    let spaceId = data.spaceId.toString();
    if (!Types.ObjectId.isValid(spaceId)) {
      const space = await SpaceService.findOne(userId, spaceId);
      if (!space) throw new Error('Space not found');
      spaceId = (space._id as any).toString();
    }

    const hasAccess = await SpaceService.checkOwnership(userId, spaceId);
    if (!hasAccess) {
      throw new Error('Access denied to space');
    }

    if (data.position === undefined) {
      const count = await Subject.countDocuments({ spaceId: spaceId });
      data.position = count;
    }

    const subject = new Subject({ ...data, spaceId: spaceId });
    return await subject.save();
  }

  static async findAll(userId: string, spaceIdentifier: string): Promise<ISubject[]> {
    const space = await SpaceService.findOne(userId, spaceIdentifier);
    if (!space) {
      throw new Error('Access denied or Space not found');
    }

    return await Subject.find({ spaceId: space._id }, '_id title spaceId position slug').sort({ position: 1, createdAt: 1 });
  }

  static async findOne(userId: string, identifier: string): Promise<ISubject | null> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };

    const subject = await Subject.findOne(query);
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

  static async checkOwnership(userId: string, identifier: string): Promise<boolean> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };
    const subject = await Subject.findOne(query);
    if (!subject) return false;
    return await SpaceService.checkOwnership(userId, subject.spaceId.toString());
  }
}
