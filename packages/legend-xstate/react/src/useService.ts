import type { AnyInterpreter } from 'xstate';
import { InterpreterStatus } from 'xstate';
import { useSelector as useXstateSelector } from '@xstate/react';

export const useService = <Service extends AnyInterpreter>(service: Service, getSnapshot?: any) => {
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
