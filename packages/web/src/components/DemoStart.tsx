import { Trans } from '@lingui/react/macro';
import { LightbulbIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

interface DemoStartProps {
  onStart: () => void;
  isLoading: boolean;
}

const DemoStart = ({ onStart, isLoading }: DemoStartProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-2 sm:p-4">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center justify-center">
            <div className="bg-primary/10 rounded-full p-2">
              <LightbulbIcon className="text-primary h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            <Trans>Demo Mode</Trans>
          </CardTitle>
          <CardDescription className="text-center">
            <Trans>Experience Seon Goals without creating an account</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="break-keep text-pretty">
            <Trans>
              This demo allows you to try all features without signing up. Your
              data will be stored locally on your device.
            </Trans>
          </p>
          <div className="bg-muted rounded-md p-3 text-sm">
            <p className="font-medium">
              <Trans>What you can do in demo mode:</Trans>
            </p>
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
                <Trans>Test all app features</Trans>
              </li>
            </ul>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            <p className="text-balance break-keep">
              <Trans>
                Note: Seon Goals is still in early development. Many additional
                features are planned for future updates.
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
    </div>
  );
};

export default DemoStart;
