
import ContentBlock, { type IContentBlock } from '../models/ContentBlock.ts';
import { TopicService } from './topic.service.ts';
import { Types } from 'mongoose';

export class ContentService {

  static async create(userId: string, data: Partial<IContentBlock>): Promise<IContentBlock> {
    if (!data.topicId) {
      throw new Error('Topic ID is required');
    }

    // Resolve topic slug to ID if necessary
    let topicId = data.topicId.toString();
    if (!Types.ObjectId.isValid(topicId)) {
      const topic = await TopicService.findOne(userId, topicId);
      if (!topic) throw new Error('Topic not found');
      topicId = (topic._id as any).toString();
    }

    const hasAccess = await TopicService.checkOwnership(userId, topicId);
    if (!hasAccess) {
      throw new Error('Access denied to topic');
    }

    if (data.position === undefined) {
      const count = await ContentBlock.countDocuments({ topicId: topicId });
      data.position = count;
    }

    const block = new ContentBlock({ ...data, topicId: topicId });
    return await block.save();
  }

  static async findAll(userId: string, topicIdentifier: string): Promise<IContentBlock[]> {
    const topic = await TopicService.findOne(userId, topicIdentifier);
    if (!topic) {
      throw new Error('Access denied or Topic not found');
    }

    return await ContentBlock.find({ topicId: topic._id }, '_id topicId kind content question options data position').sort({ position: 1 });
  }

  static async update(userId: string, blockId: string, data: Partial<IContentBlock>): Promise<IContentBlock | null> {
    const block = await ContentBlock.findById(blockId);
    if (!block) return null;

    const hasAccess = await TopicService.checkOwnership(userId, block.topicId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await ContentBlock.findByIdAndUpdate(blockId, data, { new: true });
  }

  static async delete(userId: string, blockId: string): Promise<IContentBlock | null> {
    const block = await ContentBlock.findById(blockId);
    if (!block) return null;

    const hasAccess = await TopicService.checkOwnership(userId, block.topicId.toString());
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await ContentBlock.findByIdAndDelete(blockId);
  }
}
