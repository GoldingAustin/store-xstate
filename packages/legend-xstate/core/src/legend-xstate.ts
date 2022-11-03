import type { Observable, ObservableComputed } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { Assigner, EventObject, AssignAction, LowInfer } from 'xstate';
import { assign as xstateAssign } from 'xstate';
import type { ObservableContextComputed, ToObservableComputed } from './types';

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
 * Transforms context into observable with an optional second argument to create computed values
 * @param context {TContext} An XState context object
 * @param computed {(ctx: TContext) => Record<PropertyKey, unknown>} A callback with a context argument which should return an object with computed values
 */
export function observableContext<
  TContext,
  TComputed extends Record<PropertyKey, ObservableComputed> = 'computed' extends keyof TContext
    ? ToObservableComputed<TContext['computed']>
    : any,
  Context = 'computed' extends keyof TContext ? Omit<TContext, 'computed'> : TContext
>(
  context: LowInfer<Context>,
  computed?: (
    context: LowInfer<Observable<Context>> & {
      computed: 'computed' extends keyof TContext ? ToObservableComputed<TContext['computed']> : unknown;
    }
  ) => TComputed
): ObservableContextComputed<Context, TComputed> {
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
