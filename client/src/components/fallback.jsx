import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LoaderCircle, Unplug } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { useSelector } from 'react-redux';

export function Fallback({ children, delay = 5000, className }) {
  const { userAccount } = useSelector((state) => state.wallet);
  const [show, setShow] = useState(false);
  const [_isPending, startTransition] = useTransition();

  // Kick off the delay on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => setShow(true)); // non-blocking reveal
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'absolute top-2/4 left-2/4 mx-[auto] my-[0] -translate-x-1/2 -translate-y-1/2 text-foreground/50',
        { 'animate-pulse': !userAccount },
        className,
      )}
    >
      {!show ? (
        <LoaderCircle className="animate-spin" />
      ) : !userAccount ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Unplug />
          </TooltipTrigger>
          <TooltipContent>Disconnected wallet</TooltipContent>
        </Tooltip>
      ) : (
        children
      )}
    </div>
  );
}
