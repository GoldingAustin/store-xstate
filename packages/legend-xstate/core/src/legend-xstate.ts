import { observable } from '@legendapp/state';
import type { Assigner, EventObject, AssignAction, LowInfer } from 'xstate';
import { assign as xstateAssign } from 'xstate';
import type { ContextReturn, ObservableValue, ToObservableComputed } from './types';

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
export function createContext<
  TContext,
  Computed extends Record<PropertyKey, unknown> | undefined,
  ComputedFunc extends (context: LowInfer<ObservableValue<TContext>>  & {computed: LowInfer<Computed>}) => Computed = (
    context: LowInfer<ObservableValue<TContext>> & {computed: LowInfer<Computed>}
  ) => Computed
>(
  context: TContext,
  computed: ComputedFunc
): ContextReturn<TContext, Computed>;
export function createContext<TContext, Computed extends Record<PropertyKey, unknown> | undefined>(
  ...args:
    | [TContext]
    | [TContext, (context: LowInfer<ObservableValue<TContext>> & { computed: LowInfer<Computed> }) => Computed]
    | [TContext, ((context: LowInfer<ObservableValue<TContext>> & { computed: LowInfer<Computed> }) => Computed)?]
): ContextReturn<
  TContext,
  ToObservableComputed<Computed extends (context: LowInfer<ObservableValue<TContext>>) => infer C ? C : Computed>
> {
  const [context, computed] = args;
  const obs: any = observable(context);
  const store = {
    ...obs,
    get: obs.get,
    set: obs.set,
    peek: obs.peek,
    onChange: obs.onChange,
    assign: obs.assign,
    delete: obs.delete,
    proxy: obs.proxy,
    children: obs.children,
    root: obs.root,
    ownKeys: obs.ownKeys,
    deleteProperty: obs.deleteProperty,
    has: obs.has,
    id: obs.id,
    getOwnPropertyDescriptor: obs.getOwnPropertyDescriptor,
    getPrototypeOf: obs.getPrototypeOf,
  };
  if (computed) store.computed = computed(store);
  return store;
}
