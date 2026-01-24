
import Space, { type ISpace } from '@/models/Space.ts';
import { Types } from 'mongoose';

export class SpaceService {

  static async create(userId: string, data: Partial<ISpace>): Promise<ISpace> {
    const space = new Space({ ...data, userId });
    return await space.save();
  }

  static async findAll(userId: string): Promise<any[]> {
    const spaces = await Space.find({ userId }, '_id name description slug icon subjectCount').sort({ createdAt: -1 });

    // Aggregate question counts for these spaces
    const spaceIds = spaces.map(s => s._id);
    const agg = await import('../models/Subject.ts').then(m => m.default.aggregate([
      { $match: { spaceId: { $in: spaceIds } } },
      { $group: { _id: '$spaceId', total: { $sum: '$questionCount' } } }
    ])); // Using dynamic import to avoid circular dependency if any, or just import Subject at top

    const countMap = new Map(agg.map((a: any) => [a._id.toString(), a.total]));

    return spaces.map(s => ({
      ...s.toObject(),
      questionCount: countMap.get((s._id as any).toString()) || 0
    }));
  }

  static async findOne(userId: string, identifier: string): Promise<ISpace | null> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier, userId }
      : { slug: identifier, userId };
    return await Space.findOne(query, '_id name description slug icon');
  }

  static async update(userId: string, spaceId: string, data: Partial<ISpace>): Promise<ISpace | null> {
    return await Space.findOneAndUpdate(
      { _id: spaceId, userId },
      data,
      { new: true, select: '_id name description icon' }
    );
  }

  static async delete(userId: string, spaceId: string): Promise<ISpace | null> {
    return await Space.findOneAndDelete({ _id: spaceId, userId });
  }

  static async checkOwnership(userId: string, identifier: string): Promise<boolean> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier, userId }
      : { slug: identifier, userId };
    const count = await Space.countDocuments(query);
    return count > 0;
  }
}
