
import Space, { type ISpace } from '../models/Space.ts';
import { Types } from 'mongoose';

export class SpaceService {
  
  static async create(userId: string, data: Partial<ISpace>): Promise<ISpace> {
    const space = new Space({ ...data, userId });
    return await space.save();
  }

  static async findAll(userId: string): Promise<ISpace[]> {
    return await Space.find({ userId }, '_id name description').sort({ createdAt: -1 });
  }

  static async findOne(userId: string, spaceId: string): Promise<ISpace | null> {
    return await Space.findOne({ _id: spaceId, userId }, '_id name description');
  }

  static async update(userId: string, spaceId: string, data: Partial<ISpace>): Promise<ISpace | null> {
    return await Space.findOneAndUpdate(
      { _id: spaceId, userId },
      data,
      { new: true, select: '_id name description' }
    );
  }

  static async delete(userId: string, spaceId: string): Promise<ISpace | null> {
    return await Space.findOneAndDelete({ _id: spaceId, userId });
  }

  static async checkOwnership(userId: string, spaceId: string): Promise<boolean> {
    const count = await Space.countDocuments({ _id: spaceId, userId });
    return count > 0;
  }
}
