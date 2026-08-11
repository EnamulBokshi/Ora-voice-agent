import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KnowledgeBase, KnowledgeBaseDocument } from './schemas/knowledge-base.schema';
import { KnowledgeChunk, KnowledgeChunkDocument } from './schemas/knowledge-chunk.schema';
import { CreateKnowledgeDocDto } from './dto/create-knowledge-doc.dto';
import { UpdateKnowledgeDocDto } from './dto/update-knowledge-doc.dto';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectModel(KnowledgeBase.name)
    private readonly knowledgeBaseModel: Model<KnowledgeBaseDocument>,
    @InjectModel(KnowledgeChunk.name)
    private readonly knowledgeChunkModel: Model<KnowledgeChunkDocument>,
  ) {}

  async create(
    businessId: string,
    dto: CreateKnowledgeDocDto,
  ): Promise<{ document: KnowledgeBaseDocument; chunksCount: number }> {
    const bId = new Types.ObjectId(businessId);

    const doc = new this.knowledgeBaseModel({
      ...dto,
      businessId: bId,
    });

    const savedDoc = await doc.save();

    // Perform text chunking
    const chunks = this.chunkText(savedDoc.content);
    const chunkDocs = chunks.map((chunkText, index) => ({
      businessId: bId,
      knowledgeBaseId: savedDoc._id,
      text: chunkText,
      chunkIndex: index,
      metadata: {
        docTitle: savedDoc.title,
        docType: savedDoc.docType,
      },
    }));

    if (chunkDocs.length > 0) {
      await this.knowledgeChunkModel.insertMany(chunkDocs as any[]);
    }

    return {
      document: savedDoc,
      chunksCount: chunkDocs.length,
    };
  }

  async findAll(businessId: string, docType?: string, search?: string) {
    const filter: Record<string, any> = {
      businessId: businessId as any,
      isActive: true,
    };

    if (docType) {
      filter.docType = docType;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await this.knowledgeBaseModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .exec();

    return items;
  }

  async findOne(businessId: string, id: string): Promise<KnowledgeBaseDocument> {
    const doc = await this.knowledgeBaseModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!doc) {
      throw new DomainException(
        'KNOWLEDGE_DOC_NOT_FOUND',
        `Knowledge document with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return doc;
  }

  async findChunksForDoc(
    businessId: string,
    knowledgeBaseId: string,
  ): Promise<KnowledgeChunkDocument[]> {
    return this.knowledgeChunkModel
      .find({
        businessId: businessId as any,
        knowledgeBaseId: knowledgeBaseId as any,
      })
      .sort({ chunkIndex: 1 })
      .exec();
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateKnowledgeDocDto,
  ): Promise<{ document: KnowledgeBaseDocument; chunksCount?: number }> {
    const doc = await this.findOne(businessId, id);

    const isContentUpdated = dto.content && dto.content !== doc.content;

    Object.assign(doc, dto);
    const updatedDoc = await doc.save();

    let chunksCount: number | undefined;

    if (isContentUpdated) {
      // Delete existing chunks and re-chunk
      await this.knowledgeChunkModel.deleteMany({
        knowledgeBaseId: updatedDoc._id as any,
      });

      const chunks = this.chunkText(updatedDoc.content);
      const chunkDocs = chunks.map((chunkText, index) => ({
        businessId: new Types.ObjectId(businessId),
        knowledgeBaseId: updatedDoc._id,
        text: chunkText,
        chunkIndex: index,
        metadata: {
          docTitle: updatedDoc.title,
          docType: updatedDoc.docType,
        },
      }));

      if (chunkDocs.length > 0) {
        await this.knowledgeChunkModel.insertMany(chunkDocs as any[]);
      }
      chunksCount = chunkDocs.length;
    }

    return {
      document: updatedDoc,
      chunksCount,
    };
  }

  async remove(businessId: string, id: string): Promise<{ message: string }> {
    const result = await this.knowledgeBaseModel
      .deleteOne({ _id: id as any, businessId: businessId as any })
      .exec();

    if (result.deletedCount === 0) {
      throw new DomainException(
        'KNOWLEDGE_DOC_NOT_FOUND',
        `Knowledge document with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Cascade delete chunks
    await this.knowledgeChunkModel.deleteMany({ knowledgeBaseId: id as any });

    return { message: 'Knowledge base document and its chunks deleted successfully.' };
  }

  /**
   * Chunks text into ~500 character snippets with 50 character overlap
   */
  private chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
    if (!text || text.trim().length === 0) return [];
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (normalized.length <= chunkSize) return [normalized];

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length) {
      let end = start + chunkSize;
      if (end >= normalized.length) {
        chunks.push(normalized.substring(start));
        break;
      }

      // Try to break at a newline or period or space to avoid cutting words
      const lastNewline = normalized.lastIndexOf('\n', end);
      const lastPeriod = normalized.lastIndexOf('. ', end);
      const lastSpace = normalized.lastIndexOf(' ', end);

      if (lastNewline > start + chunkSize / 2) {
        end = lastNewline + 1;
      } else if (lastPeriod > start + chunkSize / 2) {
        end = lastPeriod + 1;
      } else if (lastSpace > start + chunkSize / 2) {
        end = lastSpace + 1;
      }

      chunks.push(normalized.substring(start, end).trim());
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }
}
