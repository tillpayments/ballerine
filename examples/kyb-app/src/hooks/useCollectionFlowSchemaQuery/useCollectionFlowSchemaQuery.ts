import { collectionFlowQuerykeys } from '@app/domains/collection-flow';
import { useQuery } from '@tanstack/react-query';
import { HTTPError } from 'ky';

export const useCollectionFlowSchemaQuery = () => {
  const { isLoading, error, data } = useQuery({
    ...collectionFlowQuerykeys.getCollectionFlowSchema(),
    staleTime: Infinity,
  });

  return {
    isLoading,
    steps: data ? data.steps : [],
    documentConfigurations: data ? data.documentConfigurations : [],
    error: error as HTTPError,
  };
};