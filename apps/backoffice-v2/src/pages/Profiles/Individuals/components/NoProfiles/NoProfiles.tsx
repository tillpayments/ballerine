import { NoCasesSvg } from '@/common/components/atoms/icons';
import { FunctionComponent } from 'react';

export const NoProfiles: FunctionComponent = () => {
  return (
    <div className="flex items-center justify-center p-4 pb-72">
      <div className="inline-flex flex-col  items-start gap-4 rounded-md border-[1px] border-[#CBD5E1] p-6">
        <div className="flex w-[464px] items-center justify-center">
          <NoCasesSvg width={96} height={81} />
        </div>

        <div className="flex w-[464px] flex-col items-start gap-2">
          <h2 className="text-lg font-[600]">No profiles found</h2>

          <div className="text-sm leading-[20px]">
            <p className="font-[400]">
              It looks like there aren&apos;t any profiles in your system right now.
            </p>

            <div className="mt-[20px] flex flex-col">
              <span className="font-[700]">What can you do now?</span>

              <ul className="list-disc pl-6 pr-2">
                <li>Make sure to refresh or check back often for new profiles.</li>
                <li>Ensure that your filters aren&apos;t too narrow.</li>
                <li>
                  If you suspect a technical issue, reach out to your technical team to diagnose the
                  issue.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
