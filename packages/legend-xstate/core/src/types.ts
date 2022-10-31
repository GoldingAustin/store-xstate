// Prevent literal types from causing problems, map undefined to any so undefined unions don't break
import type { Observable, ObservableComputed } from '@legendapp/state';
import type { LowInfer } from 'xstate';

type Input<T> = T extends Observable
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

export type ObservableValue<Value> = Observable<Input<Value>>;
type BaseContext<
  TContext,
  TComputed extends Record<PropertyKey, unknown> | undefined = undefined,
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
