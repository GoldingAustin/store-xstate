import type { AnyStateMachine, StateMachine } from 'xstate';
import { useMachine as xstateUseMachine } from '@xstate/react/lib/useMachine';
import { useMemo } from 'react';
import { observableContext } from 'legend-xstate';
import { useInterpret } from '@xstate/react';
import { useService } from './useService';
import type { Observable } from '@legendapp/state';

const isObservableContext = (context: any) => {
  return context.get && context.set && context.peek && context.onChange && context.proxy;
};
const getOverrideContext = (context: Observable, newContext: Observable | any) =>
  observableContext({ ...context.peek(), ...(isObservableContext(newContext) ? newContext.peek() : newContext) });
export const useMachine = <Machine extends AnyStateMachine>(
  machine: Parameters<typeof xstateUseMachine<Machine>>[0],
  options: Parameters<
    typeof xstateUseMachine<
      'peek' extends keyof Machine['__TContext']
        ? StateMachine<
            ReturnType<Machine['__TContext']['peek']>,
            Machine['__TStateSchema'],
            Machine['__TEvent'],
            Machine['__TTypestate']
          >
        : Machine
    >
  >[1] = {}
) => {
  const opts = useMemo(() => {
    const mach = typeof machine === 'function' ? machine() : machine;
    if (options.context && !isObservableContext(options.context)) {
      options.context = getOverrideContext(mach.context, options.context);
    }
    if (options.state?.context) {
      options.state.context = getOverrideContext(mach.context, options.state.context);
    }
    return options;
  }, [options]);
  const service = useInterpret(machine, opts);
  return useService(service) as ReturnType<typeof xstateUseMachine<Machine>>;
};
