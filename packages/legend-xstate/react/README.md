# legend-xstate/react (Legend-State + XState)

`legend-xstate/react` Exports optimized versions of `useMachine` and `useActor` that only rerender when absolutely necessary. Component don't rerender on any context changes, they only rerender the `state.value` changes so `state.can`, `state.matches`, `state.hasTags`, etc. are run accordingly.

It's important to wrap your components in `legendapp/state`'s `observer` wrapper.

The tests for `useMachine` and `useActor` are all ported from `@xstate/react` (thanks `@xstate/react` team :))

### Hooks
- `useActor`: Optimized version of `@xstate/react`'s `useActor` with the same inputs and outputs.
- `useMachine`: Optimized version of `@xstate/react`'s `useMachine` with the same inputs and outputs.
- `useStateStore`: A helper hook that accepts a `State` object and returns the `observable` context store. You can still access the store without this hook using `state.context.store`;

### Example

```typescript jsx
import { observer, enableLegendStateReact } from '@legendapp/state/react';
import { useMachine, useStateStore } from 'legend-xstate/react';
enableLegendStateReact();


const Counter = observer(() => {
  // Using the same machine as above, optimized to take full advantage of `@legendapp/state/react`'s performance.
  // the full component will never re-render because `state.value` never changed
  const [state, send] = useMachine(counterMachine);
  const store = useStateStore(state); // store can also be accessed with `state.context.store`
  return (
    <div>
      
      count is {store.count}
      <button onClick={() => send({ type: "INC" })}>INC</button>
      <button onClick={() => send({ type: "DEC" })}>DEC</button>
    </div>
  );
});
```

#### TODO

- If XState had a `set` action that did not overwrite the root object on context update, the store could be used as context
- Try to make typing the machine easier
- Add more tests