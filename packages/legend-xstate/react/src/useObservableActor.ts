/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 David Khourshid
 * Copyright (c) 2022 Austin Golding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { ActorRef, EventObject, Sender } from 'xstate';
import { useObservableService } from './useObservableService';
import { useCallback, useLayoutEffect, useRef } from 'react';

type EmittedFromActorRef<TActor extends ActorRef<any, any>> = TActor extends ActorRef<any, infer TEmitted>
  ? TEmitted
  : never;

function isDeferredActor<T extends ActorRef<any>>(actorRef: T): actorRef is T & { deferred: boolean } {
  return 'deferred' in actorRef;
}
function defaultGetSnapshot<TEmitted>(actorRef: ActorRef<any, TEmitted>): TEmitted | undefined {
  return 'getSnapshot' in actorRef ? actorRef.getSnapshot() : 'state' in actorRef ? (actorRef as any).state : undefined;
}

export function useObservableActor<TActor extends ActorRef<any, any>>(
  actorRef: TActor,
  getSnapshot?: (actor: TActor) => EmittedFromActorRef<TActor>
): [EmittedFromActorRef<TActor>, TActor['send']];
export function useObservableActor<TEvent extends EventObject, TEmitted>(
  actorRef: ActorRef<TEvent, TEmitted>,
  getSnapshot?: (actor: ActorRef<TEvent, TEmitted>) => TEmitted
): [TEmitted, Sender<TEvent>];
export function useObservableActor(
  actorRef: ActorRef<EventObject, unknown>,
  getSnapshot: (actor: ActorRef<EventObject, unknown>) => unknown = defaultGetSnapshot
): [unknown, Sender<EventObject>] {
  const actorRefRef = useRef(actorRef);
  const deferredEventsRef = useRef<(EventObject | string)[]>([]);
  const boundGetSnapshot = useCallback(() => getSnapshot(actorRef), [actorRef, getSnapshot]);
  const send: Sender<EventObject> = useCallback((...args) => {
    const event = args[0];
    if (process.env.NODE_ENV !== 'production' && args.length > 1) {
      console.warn(
        `Unexpected payload: ${JSON.stringify(
          (args as any)[1]
        )}. Only a single event object can be sent to actor send() functions.`
      );
    }
    const currentActorRef = actorRefRef.current;
    if (isDeferredActor(currentActorRef) && currentActorRef.deferred) {
      deferredEventsRef.current.push(event);
    } else {
      currentActorRef.send(event);
    }
  }, []);

  useLayoutEffect(() => {
    actorRefRef.current = actorRef;
    while (deferredEventsRef.current.length > 0) {
      const deferredEvent = deferredEventsRef.current.shift()!;
      actorRef.send(deferredEvent);
    }
  }, [actorRef]);

  const [state] = useObservableService(actorRef as any, boundGetSnapshot);
  return [state, send];
}
