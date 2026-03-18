import { Injectable, NotFoundException } from '@nestjs/common';
import { IssueStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueListQueryDto } from './dto/issue-list-query.dto';

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, dto: CreateIssueDto, userId: string) {
    return this.prisma.issue.create({
      data: {
        storeId,
        title: dto.title,
        description: dto.description || null,
        priority: dto.priority || 'MEDIUM',
        assignedTo: dto.assignedTo || null,
        createdBy: userId,
      },
    });
  }

  async findAll(storeId: string, query: IssueListQueryDto) {
    const { priority, status, page = 1, limit = 20 } = query;

    const where: any = { storeId };

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(storeId: string, issueId: string) {
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, storeId },
    });

    if (!issue) {
      throw new NotFoundException(
        `Issue with id '${issueId}' not found`,
      );
    }

    return issue;
  }

  async update(storeId: string, issueId: string, dto: UpdateIssueDto) {
    await this.findOne(storeId, issueId);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assignedTo !== undefined) updateData.assignedTo = dto.assignedTo;

    return this.prisma.issue.update({
      where: { id: issueId },
      data: updateData,
    });
  }

  async updateStatus(storeId: string, issueId: string, status: IssueStatus) {
    await this.findOne(storeId, issueId);

    return this.prisma.issue.update({
      where: { id: issueId },
      data: { status },
    });
  }
}
