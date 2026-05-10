import { Injectable } from "@nestjs/common";
import { Subject, Observable, merge, interval } from "rxjs";
import { map, finalize } from "rxjs/operators";
import type { MessageEvent } from "@nestjs/common";

type Notification = {
  type: string;
  [key: string]: unknown;
};

type ProgressState = { current: number; total: number; subject: Subject<MessageEvent> };

@Injectable()
export class NotificationsService {
  private readonly subject = new Subject<MessageEvent>();
  private readonly progressMap = new Map<string, ProgressState>();

  broadcast(notification: Notification): void {
    this.subject.next({ data: notification });
  }

  stream(): Observable<MessageEvent> {
    return merge(
      interval(30_000).pipe(map(() => ({ data: { type: "ping" } } as MessageEvent))),
      this.subject.asObservable(),
    );
  }

  initProgress(ticker: string, total: number): void {
    const existing = this.progressMap.get(ticker);
    if (existing) existing.subject.complete();
    this.progressMap.set(ticker, { current: 0, total, subject: new Subject<MessageEvent>() });
  }

  broadcastProgress(ticker: string, title: string, sentiment: number): void {
    const state = this.progressMap.get(ticker);
    if (!state) return;
    state.current++;
    state.subject.next({ data: { type: "progress", ticker, title, sentiment, current: state.current, total: state.total } });
    if (state.current >= state.total) {
      state.subject.complete();
      this.progressMap.delete(ticker);
    }
  }

  streamProgress(ticker: string): Observable<MessageEvent> {
    let state = this.progressMap.get(ticker);
    if (!state) {
      // No active job — return empty stream with just a ping so EventSource doesn't error
      state = { current: 0, total: 0, subject: new Subject<MessageEvent>() };
      this.progressMap.set(ticker, state);
      setTimeout(() => { state!.subject.complete(); this.progressMap.delete(ticker); }, 0);
    }
    return merge(
      interval(30_000).pipe(map(() => ({ data: { type: "ping" } } as MessageEvent))),
      state.subject.asObservable(),
    ).pipe(finalize(() => { /* client disconnected */ }));
  }
}
