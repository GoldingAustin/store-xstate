import { observable } from '@legendapp/state';
import type { Assigner, EventObject, AssignAction, LowInfer } from 'xstate';
import { assign as xstateAssign } from 'xstate';
import type { ContextReturn, ObservableValue } from './types';

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

/**
 *
 * @param context The context that will be converted into a store
 * @param computed A callback that returns an object with computed properties
 */
export function createContext<TContext>(context: TContext): ContextReturn<TContext, undefined>;
export function createContext<TContext, Computed extends Record<PropertyKey, unknown>>(
  context: TContext,
  computed: (context: LowInfer<ObservableValue<TContext>>) => Computed
): ContextReturn<TContext, Computed>;
export function createContext<TContext, Computed extends Record<PropertyKey, unknown> | undefined>(
  ...args: [TContext] | [TContext, (context: LowInfer<ObservableValue<TContext>>) => Computed]
): ContextReturn<TContext, Computed> {
  const [context, computed] = args;
  const store: any = observable(context);
  return {
    ...store,
    ...(computed ? { computed: computed(store) } : {}),
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
