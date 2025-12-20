
import ContentBlock, { type IContentBlock } from '../models/ContentBlock.ts';
import { TopicService } from './topic.service.ts';

export class ContentService {

  static async create(userId: string, data: Partial<IContentBlock>): Promise<IContentBlock> {
    if (!data.topicId) {
      throw new Error('Topic ID is required');
    }
    const hasAccess = await TopicService.checkOwnership(userId, data.topicId.toString());
    if (!hasAccess) {
      throw new Error('Access denied to topic');
    }

    if (data.position === undefined) {
      const count = await ContentBlock.countDocuments({ topicId: data.topicId });
      data.position = count;
    }

    const block = new ContentBlock(data);
    return await block.save();
  }

  static async findAll(userId: string, topicId: string): Promise<IContentBlock[]> {
    const hasAccess = await TopicService.checkOwnership(userId, topicId);
    if (!hasAccess) {
      throw new Error('Access denied to topic');
    }
    return await ContentBlock.find({ topicId }, '_id topicId kind content question options data position').sort({ position: 1 });
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
