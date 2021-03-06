import {SapphireNoopStorage, SapphireStorage} from '../../helper/sapphire-storage';
import {IPrefilter} from '../../collection/prefilter/iprefilter';
import {BehaviorSubject, combineLatest, Observable, of, ReplaySubject} from 'rxjs';
import {CollectionHelper} from '../../helper/collection-helper';
import {filter, map, skip, switchMap} from 'rxjs/operators';
import {CollectionCommandBase} from '../../command/collection-command-base';
import {ConnectionManager} from '../../connection/connection-manager';
import {ValidatedResponseBase} from '../../command/validated-response-base';
import {ConnectionState} from '../../models/types';
import {ExecuteCommandsCommand} from '../../command/execute-commands/execute-commands-command';
import {ExecuteCommandsResponse} from '../../command/execute-commands/execute-commands-response';
import {OfflineResponse} from './offline-response';
import {CreateRangeCommand} from '../../command/create-range/create-range-command';
import {UpdateRangeCommand} from '../../command/update-range/update-range-command';
import {UpdateResponse} from '../../command/update-range/update-range-response';
import {DeleteRangeCommand} from '../../command/delete-range/delete-range-command';
import {OfflineHelper} from './offline-helper';

const CollectionStoragePrefix = 'sapphiredb.collection.';
const CollectionChangeStorage = 'sapphiredb.collectionchanges';

export class OfflineManager {
  private disableUpdate = false;
  private changeStorage$: BehaviorSubject<{ [collectionKey: string]: CollectionCommandBase[] }> =
    new BehaviorSubject<{ [p: string]: CollectionCommandBase[] }>({});

  public offlineTransferResults$ = new ReplaySubject<ExecuteCommandsResponse>();

  constructor(private storage: SapphireStorage, private connectionManager: ConnectionManager) {
    if (!this.storage) {
      console.warn('No storage was configured. Using SapphireNoopStorage and will not store things locally.');
      this.storage = new SapphireNoopStorage();
    }

    this.changeStorage$.pipe(skip(1)).subscribe((changes) => {
      this.storage.set(CollectionChangeStorage, JSON.stringify(changes));
    });

    combineLatest([this.connectionManager.connection.connectionInformation$, this.changeStorage$])
      .pipe(
        filter(([information]) => !this.disableUpdate && information.readyState === ConnectionState.connected),
        switchMap(([, changeStorage]) => {
          const allChanges: CollectionCommandBase[] = Object.keys(changeStorage)
            .map(key => changeStorage[key])
            .reduce((a, b) => a.concat(b), []);

          if (allChanges.length === 0) {
            return of(null);
          }

          return this.connectionManager.sendCommand(new ExecuteCommandsCommand(allChanges));
        })
      ).subscribe((response: ExecuteCommandsResponse|null) => {
        this.disableUpdate = true;
        this.changeStorage$.next({});
        this.disableUpdate = false;
        this.offlineTransferResults$.next(response);
      });

    this.storage.get(CollectionChangeStorage).subscribe((changeStorage) => {
      if (!!changeStorage) {
        this.changeStorage$.next(JSON.parse(changeStorage));
      }
    });
  }

  getState(collectionName: string, prefilters: IPrefilter<any, any>[]): Observable<any> {
    const offlineKey = `${CollectionStoragePrefix}${collectionName}.${CollectionHelper.getPrefilterHash(prefilters)}`;
    return this.storage.get(offlineKey).pipe(
      map(v => {
        const result = !!v ? JSON.parse(v) : null;
        if (!!result) {
          return result;
        }

        if (!CollectionHelper.hasAfterQueryPrefilter(prefilters)) {
          return [];
        }

        return null;
      })
    );
  }

  setState(collectionName: string, prefilters: IPrefilter<any, any>[], state: any) {
    const offlineKey = `${CollectionStoragePrefix}${collectionName}.${CollectionHelper.getPrefilterHash(prefilters)}`;
    return this.storage.set(offlineKey, JSON.stringify(state));
  }

  sendCommand(command: CreateRangeCommand|UpdateRangeCommand|DeleteRangeCommand, primaryKeys: string[]): Observable<any> {
    const connectionState: ConnectionState = this.connectionManager.connection.connectionInformation$.value.readyState;

    if (connectionState === ConnectionState.connected) {
      return <Observable<ValidatedResponseBase>>this.connectionManager.sendCommand(command);
    }

    const changeStorageValue = this.changeStorage$.value;

    if (!changeStorageValue[command.collectionName]) {
      changeStorageValue[command.collectionName] = [];
    }

    const collectionChanges = changeStorageValue[command.collectionName];

    if (OfflineHelper.handleAddCommand(command, primaryKeys, collectionChanges)) {
      collectionChanges.push(command);
    }

    this.changeStorage$.next(changeStorageValue);

    const results = command.commandType === 'UpdateRangeCommand' ? (<UpdateRangeCommand>command).entries.map(e => e.value)
      : (<CreateRangeCommand|DeleteRangeCommand>command).values;

    return of(<OfflineResponse> {
      referenceId: command.referenceId,
      responseType: 'OfflineResponse',
      results: results
        .map((value) => (<ValidatedResponseBase>{ value: value })),
    });
  }

  getInterpolatedCollectionValue(collectionName: string, prefilters: IPrefilter<any, any>[], state: any[],
                                 primaryKeys: string[]): Observable<any> {
    return this.changeStorage$.pipe(
      map((changeStorage) => {
        if (CollectionHelper.hasAfterQueryPrefilter(prefilters)) {
          return state;
        }

        const collectionChanges = changeStorage[collectionName];

        return CollectionHelper.getInterpolatedCollectionValue(collectionChanges, state, primaryKeys);
      }),
    );
  }

  reset() {
    this.disableUpdate = true;
    this.changeStorage$.next({});
    this.disableUpdate = false;
  }
}

