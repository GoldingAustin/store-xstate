import type { AnyStateMachine } from 'xstate';
import { useMachine as xstateUseMachine } from '@xstate/react/lib/useMachine';
import { useLayoutEffect } from 'react';
import { createContext } from 'legend-xstate';
import { useInterpret } from '@xstate/react';
import { useService } from './useService';

const isObservableContext = (context: any) => {
  return context.get && context.set && context.peek && context.onChange && context.proxy;
};
export const useMachine = <Machine extends AnyStateMachine>(
  ...[machine, options = {}]: Parameters<typeof xstateUseMachine<Machine>>
) => {
  useLayoutEffect(() => {
    if (options.context && !isObservableContext(options.context))
      options.context = createContext(options.context as any);
    if (options.state?.context && !isObservableContext(options.state.context))
      options.state.context = createContext(options.state.context);
  }, [options]);
  const service = useInterpret(machine, options);
  return useService(service) as ReturnType<typeof xstateUseMachine<Machine>>;
};
