import { Trans } from '@lingui/react/macro';

import LanguageSelector from '~/shared/components/common/LanguageSelector';
import { Button } from '~/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '~/shared/components/ui/card';

interface DemoStartProps {
  onStart: () => void;
  isLoading: boolean;
}

const DemoStart = ({ onStart, isLoading }: DemoStartProps) => {
  return (
    <main className="relative flex min-h-[max(100dvh,700px)] min-w-[375px] flex-col items-center justify-center p-2 sm:p-4">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center justify-center">
            <div className="-p-2 overflow-clip rounded-full bg-gray-400/10">
              <img src="/favicon.svg" alt="Seon Logo" className="h-11 w-11" />
            </div>
          </div>
          <h1 className="text-center text-2xl">
            <Trans>Seon Demo Mode</Trans>
          </h1>
          <CardDescription className="text-center">
            <Trans>Experience Seon Goals without creating an account</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-pretty break-keep">
            <Trans>
              This demo allows you to try all features without signing up. Your
              data will be stored locally on your device.
            </Trans>
          </p>
          <div className="bg-background rounded-md border p-3 px-5 text-sm">
            <h2 className="font-medium">
              <Trans>What you can do in demo mode:</Trans>
            </h2>
            <ul className="mt-2 list-inside list-disc text-left">
              <li>
                <Trans>Create and track personal goals</Trans>
              </li>
              <li>
                <Trans>Record daily progress</Trans>
              </li>
              <li>
                <Trans>View statistics and visualizations</Trans>
              </li>
              <li>
                <Trans>Install as a PWA and use offline</Trans>
              </li>
            </ul>
          </div>
          <div
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
            role="note"
          >
            <p className="text-balance break-keep">
              <Trans>
                Note: Seon Goals is still in early development.
                <br />
                Many additional features are planned for future updates.
              </Trans>
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={onStart}
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            <Trans>Start Demo</Trans>
          </Button>
        </CardFooter>
      </Card>
      <div className="xs:px-6 absolute bottom-0 mb-1 self-start px-1 py-2 xl:p-8">
        <LanguageSelector />
      </div>
    </main>
  );
};

export default DemoStart;
