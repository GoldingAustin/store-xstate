import type { Observable, ObservableComputed } from '@legendapp/state';
import type {
  BaseActionObject,
  EventObject,
  ServiceMap,
  TypegenDisabled,
  LowInfer,
  MachineSchema,
  NoInfer,
  StateNodeConfig,
  StateSchema,
} from 'xstate';

// Prevent literal types from causing problems, map undefined to any so undefined unions don't break
export type ToObservableComputed<TComputed> = {
  [P in keyof TComputed]: TComputed[P] extends ObservableComputed ? TComputed[P] : ObservableComputed<TComputed[P]>;
};

export type ToObservableContext<TContext, TComputed extends unknown | never = never> = Observable<
  Expand<Omit<TContext, 'computed'>>
> &
  NotNever<{
    computed: TComputed extends never
      ? never
      : TComputed extends ToObservableComputed<TComputed>
      ? TComputed
      : ToObservableComputed<TComputed>;
  }>;

type NotNever<U> = {
  [K in keyof U as U[K] extends never | void ? never : K]: U[K];
};
export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type ObservableContext<TContext, TComputed extends unknown | never = never> = Expand<
  Omit<TContext, 'computed'>
> & {
  computed: TComputed;
};

export type ObservableContextComputed<TContext, TComputed> = TContext extends undefined
  ? undefined
  : ObservableContext<Observable<TContext>, ToObservableComputed<TComputed>>;

export interface ObservableMachineConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject,
  TAction extends BaseActionObject = BaseActionObject,
  TServiceMap extends ServiceMap = ServiceMap,
  TTypesMeta = TypegenDisabled,
  TComputed = Record<string, ObservableComputed>,
  TTContext = 'computed' extends keyof TContext ? Expand<Omit<TContext, 'computed'>> : TContext
> extends StateNodeConfig<
    ObservableContextComputed<NoInfer<TTContext>, unknown>,
    TStateSchema,
    NoInfer<TEvent>,
    TAction
  > {
  computed?: (
    context: ToObservableContext<TTContext, 'computed' extends keyof TContext ? TContext['computed'] : unknown>
  ) => TComputed;
  /**
   * The initial context (extended state)
   */
  context?: LowInfer<TTContext | (() => TTContext)>;
  /**
   * The machine's own version.
   */
  version?: string;
  schema?: MachineSchema<TContext, TEvent, TServiceMap>;
  tsTypes?: TTypesMeta;
}
