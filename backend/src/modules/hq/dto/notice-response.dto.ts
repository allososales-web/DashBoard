import { NoticePriority } from '@prisma/client';

export class NoticeResponseDto {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  isPublished: boolean;
  publishDate: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
