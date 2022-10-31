import type {
  Observable,
  ObservableArray,
  ObservableBaseFns,
  ObservableComputed,
  ObservableFns,
  ObservableObject,
  ObservableObjectFns,
  ObservableObjectOrArray,
} from '@legendapp/state';
import type { LowInfer } from 'xstate';

// Prevent literal types from causing problems, map undefined to any so undefined unions don't break
type Input<T> = T extends Observable
  ? T
  : T extends ObservableObjectOrArray<any>
  ? T
  : T extends ObservableObjectFns<any>
  ? T
  : T extends ObservableBaseFns<any>
  ? T
  : T extends ObservableFns<any>
  ? T
  : T extends ObservableArray<any>
  ? T
  : T extends ObservableObject
  ? T
  : T extends undefined
  ? any
  : T extends never
  ? any
  : T extends boolean
  ? boolean
  : T extends object
  ? {
      [P in keyof T]: Input<T[P]>;
    }
  : T;

export type ToObservableComputed<TComputed> = {
  [P in keyof TComputed]: ObservableComputed<TComputed[P]>;
};
export type ObservableValue<Value> = Observable<Input<Value>>;
type BaseContext<
  TContext,
  TComputed extends Record<PropertyKey, unknown> | undefined = never,
  Return extends true | false = false
> = TComputed extends undefined
  ? ObservableValue<TContext>
  : ObservableValue<TContext> & {
      computed: {
        [P in keyof TComputed]: Return extends true ? TComputed[P] : ObservableComputed<TComputed[P]>;
      };
    };

export type ContextReturn<TContext, TComputed extends Record<PropertyKey, unknown> | undefined> = LowInfer<
  BaseContext<TContext, TComputed, true>
>;

export type Context<TContext, TComputed extends Record<PropertyKey, unknown> | undefined = undefined> = BaseContext<
  TContext,
  TComputed
>;
