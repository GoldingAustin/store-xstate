# legend-xstate/react (Legend-State + XState)

`legend-xstate/react` Exports optimized versions of `useMachine` and `useActor` from `@xstate/react` as `useObservableMachine` and `useObservableActor` that only rerender when absolutely necessary. Components using machines/actors have the same fine-grained reactivity from as you'd expect with `Legend-State`, a Component only rerenders when the `state.value` changes; `state.can`, `state.matches`, `state.hasTags`, etc. are run accordingly.
You can still use `useMachine` and `useActor` from `@xstate/react` but will lose out on more optimized component rerenders without manual memoization.

It's important to wrap your components in `@legendapp/state`'s `observer` wrapper.

The tests for `useObservableMachine` and `useObservableActor` are all ported from `@xstate/react` (thanks `@xstate/react` team :))

### Hooks

- `useObservableActor`: Optimized version of `@xstate/react`'s `useActor` with the same inputs and outputs.
- `useObservableMachine`: Optimized version of `@xstate/react`'s `useMachine` with the same inputs and outputs.

### Example

```typescript jsx
import { observer, enableLegendStateReact } from '@legendapp/state/react';
import { useObservableMachine } from 'legend-xstate/react';
enableLegendStateReact();

const Counter = observer(() => {
  // Using the same machine as above, optimized to take full advantage of `@legendapp/state/react`'s performance.
  // the full component will never re-render because `state.value` never changed
  const [state, send] = useObservableMachine(counterMachine);
  return (
    <div>
      count is {state.context.count} // Changes to count will not rerender the whole component
      <button onClick={() => send({ type: 'INC' })}>INC</button>
      <button onClick={() => send({ type: 'DEC' })}>DEC</button>
    </div>
  );
});
```
