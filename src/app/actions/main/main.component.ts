import {Component, OnInit} from '@angular/core';
import {ActionHelper, ActionResult, ExecuteResponseType} from 'sapphiredb';
import { SapphireDbService } from 'ng-sapphiredb';
import {concatMap, filter, map, shareReplay, takeWhile} from 'rxjs/operators';
import {Observable, of, ReplaySubject, Subject} from 'rxjs';
import {GuidHelper} from '../../../../projects/sapphiredb/src/lib/helper/guid-helper';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.less']
})
export class MainComponent implements OnInit {

  rangeValue$: Observable<number>;

  rangeValueStream$: Observable<number>;
  rangeValueStatus$: Observable<string>;

  streamValueResponse$: Observable<string>;

  constructor(private db: SapphireDbService) { }

  ngOnInit() {
  }

  execute() {
    this.rangeValue$ = this.db.execute<string, number>('example.AsyncDelay').pipe(
      concatMap(r => {
        if (r.type === ExecuteResponseType.End) {
          return of(r, null);
        }

        return of(r);
      }),
      takeWhile(v => v !== null),
      map((r: ActionResult<string, number>) => r.notification),
      shareReplay()
    );
  }

  executeStream() {
    const result$ = this.db.execute<number, string>('example.AsyncEnumerableTest').pipe(
      shareReplay()
    );

    this.rangeValueStream$ = result$.pipe(
      filter(v => v.type === ExecuteResponseType.Async),
      map(v => v.result)
    );

    this.rangeValueStatus$ = result$.pipe(
      filter(v => v.type === ExecuteResponseType.Notify),
      map(v => v.notification)
    );
  }

  executeUpStream() {
    const subject$ = new ReplaySubject<string>();
    this.streamValueResponse$ = this.db.execute<string>('example.StreamTest', subject$).pipe(
      filter(r => !!r.result),
      map(r => r.result)
    );

    for (let i = 0; i <= 10; i++) {
      setTimeout(() => {
        subject$.next(i.toString());

        if (i === 10) {
          subject$.complete();
        }
      }, i * 200);
    }
  }

}
