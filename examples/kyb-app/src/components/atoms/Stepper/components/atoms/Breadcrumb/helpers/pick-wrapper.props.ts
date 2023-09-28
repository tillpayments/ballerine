import { ElementPropsPicker } from '@app/components/atoms/Stepper/components/atoms/Breadcrumb/helpers/types';
import { BreadcrumbsWrapperProps } from '@app/components/atoms/Stepper/components/atoms/Breadcrumb/types';
import { ctw } from '@ballerine/ui';

export const pickWrapperProps: ElementPropsPicker<BreadcrumbsWrapperProps> = (
  state,
  active,
  theme,
) => {
  const themeParams = theme[state].wrapper;

  const props: BreadcrumbsWrapperProps = {
    className: ctw(themeParams.className, { [themeParams.activeClassName || '']: active }),
  };

  return props;
};
