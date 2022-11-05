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

export type ToObservableContext<
  TContext,
  TComputed extends unknown | undefined = undefined
> = TComputed extends undefined
  ? Observable<TContext>
  : Observable<TContext> & {
      computed: ToObservableComputed<TComputed>;
    };

export type ObservableContext<TContext, TComputed extends unknown | undefined = undefined> = TComputed extends undefined
  ? TContext
  : TContext & {
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
  TComputed extends Record<string, ObservableComputed> = Record<string, ObservableComputed>,
  TTContext = 'computed' extends keyof TContext ? Omit<TContext, 'computed'> : TContext
> extends StateNodeConfig<
    ObservableContextComputed<NoInfer<TTContext>, unknown>,
    TStateSchema,
    NoInfer<TEvent>,
    TAction
  > {
  computed?: (
    context: Observable<LowInfer<TTContext>> & {
      computed: 'computed' extends keyof TContext ? ToObservableComputed<TContext['computed']> : unknown;
    }
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
