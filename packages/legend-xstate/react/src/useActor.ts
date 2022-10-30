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
import { useActor as useXstateActor } from '@xstate/react';
import { useCallback } from 'react';
import { ActorRef, EventObject, Sender } from 'xstate';
import { useService } from './useService';

type EmittedFromActorRef<
  TActor extends ActorRef<any, any>
  > = TActor extends ActorRef<any, infer TEmitted> ? TEmitted : never;

function defaultGetSnapshot<TEmitted>(actorRef: ActorRef<any, TEmitted>): TEmitted | undefined {
  return 'getSnapshot' in actorRef ? actorRef.getSnapshot() : 'state' in actorRef ? (actorRef as any).state : undefined;
}

export function useActor<TActor extends ActorRef<any, any>>(
  actorRef: TActor,
  getSnapshot?: (actor: TActor) => EmittedFromActorRef<TActor>
): [EmittedFromActorRef<TActor>, TActor['send']];
export function useActor<TEvent extends EventObject, TEmitted>(
  actorRef: ActorRef<TEvent, TEmitted>,
  getSnapshot?: (actor: ActorRef<TEvent, TEmitted>) => TEmitted
): [TEmitted, Sender<TEvent>];
export function useActor(
  actorRef: ActorRef<EventObject, unknown>,
  getSnapshot: (
    actor: ActorRef<EventObject, unknown>
  ) => unknown = defaultGetSnapshot
): [unknown, Sender<EventObject>] {
  const [, send] = useXstateActor(actorRef, getSnapshot);

  const snapshot = useCallback(() => getSnapshot(actorRef), [actorRef, getSnapshot]);
  const [state] = useService(actorRef as any, snapshot);

  return [state, send];
}
