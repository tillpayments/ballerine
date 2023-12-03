import { UIElement } from '@/domains/collection-flow';

export const getDocumentFileTypePath = (definition: UIElement) =>
  definition.valueDestination
    ?.replace(/documents\[\d+\]\./g, '')
    .replace('ballerineFileId', 'type');