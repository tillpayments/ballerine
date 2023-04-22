import { FunctionComponent } from 'react';
import { SortSvg } from '@/components/atoms/icons';
import { Item } from './SubjectsList.Item';
import { List } from './SubjectsList.List';
import {
  ISubjectsListChildren,
  ISubjectsListProps,
} from '@/components/organisms/SubjectsList/interfaces';
import { Checkbox } from '@/components/atoms/Checkbox/Checkbox';
import { useSubjectsList } from '@/components/organisms/SubjectsList/hooks/useSubjectsList/useSubjectsList';
import { TEndUser } from '@/api/types';
import { SkeletonItem } from '@/components/organisms/SubjectsList/SubjectsList.SkeletonItem';
import { Button } from '@/components/atoms/Button';
import { Filter, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/Popover/Popover';

/**
 * @description A vertical sidebar for the subjects list, with search, filter, and sort.
 * Uses dot notation for its API (i.e. SubjectsList.List), where the root component acts as a container.
 *
 * Children:
 *  - {@link SubjectsList.List} - Wraps multiple {@link SubjectsList.Item} with a ul element.
 *  - {@link SubjectsList.Item} - An li which displays a single subject's data.
 *
 * @see {@link https://reactjs.org/docs/jsx-in-depth.html#using-dot-notation-for-jsx-type|React dot notation}
 *
 * @param children
 * @param onPaginate
 * @param onSearch
 * @param onFilter
 * @param onSortBy
 * @param onSortDir
 * @param routeId
 * @param props
 * @constructor
 */
export const SubjectsList: FunctionComponent<ISubjectsListProps> & ISubjectsListChildren = ({
  children,
  onSearch,
  onFilter,
  onSortBy,
  onSortDir,
  search,
  routerId,
  ...props
}) => {
  const {
    sortByOptions,
    filterByOptions,
    filter,
    sortBy,
    searchRef,
    sortRef,
    filterRef,
    handleDropdown,
  } = useSubjectsList(routerId);

  return (
    <div
      id={`subjects-list`}
      className={`border-x border-neutral/10 theme-dark:border-neutral/60`}
      {...props}
    >
      <div className={`border-neutral/10 p-4 theme-dark:border-neutral/60`}>
        <div className="form-control mb-2 rounded-md border border-neutral/10 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary theme-dark:border-neutral/60">
          <div className="input-group items-center">
            <Button
              variant={`ghost`}
              shape={`square`}
              as={'div'}
              className={`pointer-events-none !p-2`}
            >
              <Search />
            </Button>
            <input
              type="text"
              className="input input-md w-full !border-0 !outline-none !ring-0 placeholder:text-base-content"
              placeholder={`Search by user info`}
              onChange={onSearch}
              value={search}
              ref={searchRef}
            />
          </div>
        </div>
        <div className={`flex items-center justify-between`}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={`outline`}
                size={`sm`}
                tabIndex={0}
                ref={filterRef}
                onMouseEnter={handleDropdown}
              >
                <Filter className={`me-2`} />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className={`w-96`} align={'start'}>
              {filterByOptions.map(({ label, value, options }) => (
                <Checkbox.Group
                  key={label}
                  label={label}
                  values={filter?.[value]}
                  onChange={onFilter(value as keyof TEndUser)}
                  titleProps={{
                    className: `text-base-content`,
                  }}
                  innerContainerProps={{
                    className: `w-96 flex-wrap`,
                  }}
                >
                  {options.map(({ label, value }) => (
                    <Checkbox.Item
                      key={label}
                      value={value}
                      className={`text-sm  text-base-content`}
                      checkboxProps={{
                        className: 'd-4',
                      }}
                    >
                      {label}
                    </Checkbox.Item>
                  ))}
                </Checkbox.Group>
              ))}
            </PopoverContent>
          </Popover>
          <div
            className={`form-control rounded-md border border-neutral/10 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary theme-dark:border-neutral/60`}
          >
            <div className={`input-group flex items-center`}>
              <Button
                variant={`ghost`}
                shape={'square'}
                size={`sm`}
                className={`!rounded-md focus-visible:border-none focus-visible:bg-neutral/10 focus-visible:outline-none focus-visible:ring-0 focus-visible:theme-dark:bg-neutral`}
                onClick={onSortDir}
                ref={sortRef}
              >
                <SortSvg />
              </Button>
              <select
                className={`select-bordered select select-sm !border-0 text-xs leading-snug !outline-none !ring-0`}
                onChange={onSortBy}
                value={sortBy}
              >
                <option value="" hidden disabled>
                  Sort by
                </option>
                {sortByOptions.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className={`divider my-0 px-4`}></div>
      {children}
    </div>
  );
};

SubjectsList.List = List;
SubjectsList.Item = Item;
SubjectsList.SkeletonItem = SkeletonItem;
