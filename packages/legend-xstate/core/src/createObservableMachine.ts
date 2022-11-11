import type {
  AnyEventObject,
  BaseActionObject,
  EventObject,
  MachineOptions,
  StateMachine,
  Typestate,
  ServiceMap,
  InternalMachineOptions,
  ResolveTypegenMeta,
  TypegenConstraint,
  TypegenDisabled,
} from 'xstate';
import { createMachine as xstateCreateMachine } from 'xstate';
import { observableContext } from './legend-xstate';
import type {
  ObservableContext,
  ToObservableContext,
  Expand,
  ObservableMachineConfig,
  ToObservableComputed,
} from './types';
import type { Observable } from '@legendapp/state';
/**
 * Creates an XState state machine with observable context and (optionally) computed values with the computed property
 * @param config {ObservableMachineConfig}
 * @param options {MachineOptions}
 */
export function createObservableMachine<
  TContext,
  TEvent extends EventObject = AnyEventObject,
  TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
  },
  TServiceMap extends ServiceMap = ServiceMap,
  TTypesMeta extends TypegenConstraint = TypegenDisabled,
  TComputed extends unknown | never = 'computed' extends keyof TContext
    ? ToObservableComputed<TContext['computed']>
    : never
>(
  config: ObservableMachineConfig<TContext, any, TEvent, BaseActionObject, TServiceMap, TTypesMeta, TComputed>,
  options?: InternalMachineOptions<
    ObservableContext<
      Observable<Omit<TContext, 'computed'>>,
      'computed' extends keyof TContext
        ? TContext['computed'] extends undefined
          ? TComputed
          : TContext['computed']
        : any
    >,
    TEvent,
    ResolveTypegenMeta<TTypesMeta, TEvent, BaseActionObject, TServiceMap>
  >
): StateMachine<
  ToObservableContext<Expand<Omit<TContext, 'computed'>>, TComputed>,
  any,
  TEvent,
  { value: TTypestate['value']; context: ToObservableContext<Expand<Omit<TContext, 'computed'>>, TComputed> },
  BaseActionObject,
  TServiceMap,
  ResolveTypegenMeta<TTypesMeta, TEvent, BaseActionObject, TServiceMap>
>;
export function createObservableMachine<
  TContext,
  TEvent extends EventObject = AnyEventObject,
  TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
  },
  TServiceMap extends ServiceMap = ServiceMap,
  TTypesMeta extends TypegenConstraint = TypegenDisabled,
  TComputed extends unknown | never = 'computed' extends keyof TContext
    ? ToObservableComputed<TContext['computed']>
    : never
>(
  config: ObservableMachineConfig<TContext, any, TEvent, BaseActionObject, TServiceMap, TTypesMeta, TComputed>,
  options?: MachineOptions<
    ObservableContext<
      Observable<Omit<TContext, 'computed'>>,
      'computed' extends keyof TContext
        ? TContext['computed'] extends undefined
          ? TComputed
          : TContext['computed']
        : any
    >,
    TEvent,
    BaseActionObject,
    TServiceMap,
    TTypesMeta
  >
): StateMachine<
  ToObservableContext<Expand<Omit<TContext, 'computed'>>, TComputed>,
  any,
  TEvent,
  { value: TTypestate['value']; context: ToObservableContext<Expand<Omit<TContext, 'computed'>>, TComputed> },
  BaseActionObject,
  TServiceMap,
  TTypesMeta
> {
  if (typeof config.context === 'function') {
    const contextFunc = config.context;
    config.context = () => observableContext((contextFunc as any)(), config.computed as any) as any;
  } else {
    config.context = observableContext(config.context as any, config.computed as any) as any;
  }
  return xstateCreateMachine(config as any, options as any) as any;
}
