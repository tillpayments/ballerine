import { ProcessTracker } from '@/common/components/molecules/ProcessTracker/ProcessTracker';
import { TWorkflowById } from '@/domains/workflows/fetchers';
import { ChildDocumentBlocks } from '@/lib/blocks/components/ChildDocumentBlocks/ChildDocumentBlocks';
import { NoBlocks } from '@/lib/blocks/components/NoBlocks/NoBlocks';
import { cells } from '@/lib/blocks/create-blocks-typed/create-blocks-typed';
import { useKybExampleBlocksLogic } from '@/lib/blocks/variants/KybExampleBlocks/hooks/useKybExampleBlocksLogic/useKybExampleBlocksLogic';
import { useCasePlugins } from '@/pages/Entity/hooks/useCasePlugins/useCasePlugins';
import { useCurrentCaseQuery } from '@/pages/Entity/hooks/useCurrentCaseQuery/useCurrentCaseQuery';
import { BlocksComponent } from '@ballerine/blocks';
import { DEFAULT_PROCESS_TRACKER_PROCESSES } from '@/common/components/molecules/ProcessTracker/constants';

export const KybExampleBlocks = () => {
  const {
    blocks,
    kybChildWorkflows,
    workflowId,
    parentMachine,
    onReuploadNeeded,
    isLoadingReuploadNeeded,
    isLoading,
  } = useKybExampleBlocksLogic();
  const { data: workflow } = useCurrentCaseQuery();
  const plugins = useCasePlugins({ workflow: workflow as TWorkflowById });

  return (
    <>
      {workflow?.workflowDefinition?.config?.isCaseOverviewEnabled && (
        <ProcessTracker
          workflow={workflow}
          plugins={plugins}
          processes={DEFAULT_PROCESS_TRACKER_PROCESSES}
        />
      )}
      <BlocksComponent blocks={blocks} cells={cells}>
        {(Cell, cell) => <Cell {...cell} />}
      </BlocksComponent>
      {Array.isArray(kybChildWorkflows) &&
        !!kybChildWorkflows?.length &&
        kybChildWorkflows?.map(childWorkflow => (
          <ChildDocumentBlocks
            parentWorkflowId={workflowId}
            childWorkflow={childWorkflow}
            parentMachine={parentMachine}
            key={childWorkflow?.id}
            onReuploadNeeded={onReuploadNeeded}
            isLoadingReuploadNeeded={isLoadingReuploadNeeded}
          />
        ))}
      {!isLoading && !blocks?.length && !kybChildWorkflows?.length && <NoBlocks />}
    </>
  );
};
