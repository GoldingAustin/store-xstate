import type { Observable } from '@legendapp/state';
import { observable } from '@legendapp/state';
import type { AnyState, Assigner, EventObject, AssignAction } from 'xstate';
import { assign as xstateAssign } from 'xstate';

export type Store<TContext> = { store: Observable<TContext> };
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

// Prevent literal types from causing problems
type Input<T> = T extends boolean ? boolean : T extends object ? InputObject<T> : T;
type InputObject<T> = {
  [P in keyof T]: Input<T[P]>;
};

/**
 *
 * @param context The context that will be converted into a store
 * @param _strict This is an escape hatch for conflicting union types like undefined | {}
 */
export function createContext<TContext, Strict extends boolean = true>(
  context: TContext & Strict extends true ? Input<TContext> : any,
  _strict?: Strict
): Store<TContext & Strict extends true ? Input<TContext> : any> {
  return { store: observable(context) } as Store<TContext & Strict extends true ? Input<TContext> : any>;
}

export const getStore = <State extends AnyState>(state: State): State['context']['store'] => state.context.store;
