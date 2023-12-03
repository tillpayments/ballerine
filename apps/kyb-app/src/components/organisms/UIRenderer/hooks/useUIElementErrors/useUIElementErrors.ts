import { usePageContext } from '@/components/organisms/DynamicUI/Page';
import { usePageResolverContext } from '@/components/organisms/DynamicUI/PageResolver/hooks/usePageResolverContext';
import { ErrorField } from '@/components/organisms/DynamicUI/rule-engines';
import { UIElement } from '@/domains/collection-flow';
import { AnyObject } from '@ballerine/ui';
import { useMemo } from 'react';

export const useUIElementErrors = (
  definition: UIElement<AnyObject>,
): { warnings: ErrorField[]; validationErrors: ErrorField[] } => {
  const { errors: _errors, pageErrors: _pageErrors } = usePageContext();
  const { currentPage } = usePageResolverContext();

  const errors = useMemo(() => {
    const pageErrors =
      _pageErrors[
        // @ts-ignore
        currentPage?.stateName
      ] || {};
    const fieldPageError =
      pageErrors[
        // @ts-ignore
        definition.valueDestination
      ];

    const fieldError =
      _errors[
        // @ts-ignore
        definition.valueDestination
      ] || [];

    const allErrors = [fieldPageError, ...fieldError];

    return allErrors.filter(Boolean);
  }, [definition, _errors, _pageErrors, currentPage]);

  const warnings = useMemo(() => errors.filter(error => error.type === 'warning'), [errors]);

  const validationErrors = useMemo(
    () => errors.filter(error => error.type !== 'warning'),
    [errors],
  );

  return {
    warnings,
    validationErrors,
  };
};