import { BaseCaseInformationPdfSchema } from '@/pages/Entity/pdfs/case-information/schemas/base-case-information-pdf.schema';
import { z } from 'zod';

export const TitlePageSchema = BaseCaseInformationPdfSchema.extend({});

export type TTitlePageData = z.infer<typeof TitlePageSchema>;