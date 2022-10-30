import type { ActorRef, AnyInterpreter, AnyState, AnyStateMachine } from 'xstate';
import { useInterpret } from '@xstate/react';
import type { useMachine as xstateUseMachine } from '@xstate/react';
import { useActor as useXstateActor, useSelector as useXstateSelector } from '@xstate/react';
import { createContext, getStore } from 'legend-xstate';
import { isObservable } from '@legendapp/state';
import { InterpreterStatus } from 'xstate';
import { useCallback, useLayoutEffect, useMemo } from 'react';

function defaultGetSnapshot<TEmitted>(actorRef: ActorRef<any, TEmitted>): TEmitted | undefined {
  return 'getSnapshot' in actorRef ? actorRef.getSnapshot() : 'state' in actorRef ? (actorRef as any).state : undefined;
}

const useService = <Service extends AnyInterpreter>(service: Service, getSnapshot?: any) => {
  const state = useXstateSelector(
    service,
    (state) => state,
    (a, b) => {
      if (service?.status === InterpreterStatus.NotStarted) return true;
      const initialStateChanged =
        b && b?.changed === undefined && (Object.keys(b?.children || {}).length > 0 || typeof a?.changed === 'boolean');
      return !(initialStateChanged || a?.value !== b?.value || (getSnapshot && a !== b));
    },
    getSnapshot
  );

  return [state, service.send, service];
};

export const useMachine = <Machine extends AnyStateMachine>(
  ...[machine, options = {}]: Parameters<typeof xstateUseMachine<Machine>>
) => {
  useLayoutEffect(() => {
    if (options.context?.store && !isObservable(options.context.store))
      options.context = createContext(options.context as any);
    if (options.state?.context?.store && !isObservable(options.state.context.store))
      options.state.context = createContext(options.state.context.store);
  }, [options]);
  const service = useInterpret(machine, options);
  return useService(service) as ReturnType<typeof xstateUseMachine<Machine>>;
};

// @ts-ignore
export const useActor = ((actorRef, getSnapshot = defaultGetSnapshot) => {
  const [, send] = useXstateActor(actorRef, getSnapshot);

  const snapshot = useCallback(() => getSnapshot(actorRef), [actorRef, getSnapshot]);
  const [state] = useService(actorRef, snapshot);

  return [state, send];
}) as typeof useXstateActor;

export const useStateStore = <State extends AnyState>(state: State) => {
  return useMemo(() => getStore(state), [state]);
};
