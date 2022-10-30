import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { Assigner, EventObject, AssignAction } from 'xstate';
import { assign as xstateAssign } from 'xstate';

/**
 * Assign that returns context for you
 * @param assignment
 */
export const assign = <TContext, TEvent extends EventObject = EventObject>(
  assignment: (...args: Parameters<Assigner<TContext, TEvent>>) => any
): AssignAction<TContext, TEvent> => {
  return xstateAssign((context, event, meta) => {
    assignment(context, event, meta);
    return context;
  });
};

// Prevent literal types from causing problems, map undefined to any so undefined unions don't break
type Input<T> = T extends undefined ? any : T extends boolean ? boolean : T extends object ? InputObject<T> : T;
type InputObject<T> = {
  [P in keyof T]: Input<T[P]>;
};

/**
 *
 * @param context The context that will be converted into a store
 */
export function createContext<TContext>(context: TContext): Observable<Input<TContext>> {
  const store: any = observable(context);
  return {
    ...store,
    get: store.get,
    set: store.set,
    peek: store.peek,
    onChange: store.onChange,
    assign: store.assign,
    delete: store.delete,
    proxy: store.proxy,
    children: store.children,
    root: store.root,
    ownKeys: store.ownKeys,
    deleteProperty: store.deleteProperty,
    has: store.has,
    id: store.id,
    getOwnPropertyDescriptor: store.getOwnPropertyDescriptor,
    getPrototypeOf: store.getPrototypeOf,
  };
}
