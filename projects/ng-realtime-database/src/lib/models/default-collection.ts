import {WebsocketService} from '../websocket.service';
import {Observable} from 'rxjs';
import {InfoResponse} from './response/info-response';
import {CollectionValuesService} from '../collection-values.service';
import {WherePrefilter} from './prefilter/where-prefilter';
import {SkipPrefilter} from './prefilter/skip-prefilter';
import {TakePrefilter} from './prefilter/take-prefilter';
import {OrderByPrefilter} from './prefilter/order-by-prefilter';
import {ThenOrderByPrefilter} from './prefilter/then-order-by-prefilter';
import {CollectionBase} from './collection-base';
import {CollectionManagerService} from '../collection-manager.service';
import {ReducedCollection} from './reduced-collection';
import {SelectPrefilter} from './prefilter/select-prefilter';
import {CountPrefilter} from './prefilter/count-prefilter';
import {OrderedCollection} from './ordered-collection';

export class DefaultCollection<T> extends CollectionBase<T, T[]> {
  constructor(collectionName: string,
              contextName: string,
              websocket: WebsocketService,
              collectionInformation: Observable<InfoResponse>,
              collectionValuesService: CollectionValuesService,
              collectionManagerService: CollectionManagerService) {
    super(collectionName, contextName, websocket, collectionInformation, collectionValuesService, collectionManagerService);
  }

  /**
   * Skip a number of entries
   * @param number Number of entries to skip
   */
  public skip(number: number): DefaultCollection<T> {
    return <any>this.collectionManagerService.getCollection(
      this.collectionName, this.contextName, this.prefilters, new SkipPrefilter(number));
  }

  /**
   * Take a number of entries
   * @param number Number of entries to take
   */
  public take(number: number): DefaultCollection<T> {
    return <any>this.collectionManagerService.getCollection(
      this.collectionName, this.contextName, this.prefilters, new TakePrefilter(number));
  }

  /**
   * Filter the data to query
   * @param filter A function that returns true if the data should get queried
   * @param contextData Optional data that are used in the filter function
   */
  public where<Y extends any[]>(filter: (value: T, contextData?: Y) => boolean, ...contextData: Y): DefaultCollection<T> {
    return <any>this.collectionManagerService.getCollection(
      this.collectionName, this.contextName, this.prefilters, new WherePrefilter(filter, contextData));
  }

  /**
   * Apply ordering to the collection
   * @param selector A selector to select value to order by
   * @param descending Order the selection in descending order
   * @param contextData Optional data that are used in the selector
   */
  public orderBy<Y extends any[]>(selector: (value: T, contextData?: Y) => any,
                                  descending: boolean = false, ...contextData: Y): OrderedCollection<T> {
    return <any>this.collectionManagerService.getCollection(this.collectionName, this.contextName, this.prefilters,
      new OrderByPrefilter(selector, descending, contextData));
  }

  /**
   * Only query specfic data defined by selector
   * @param selector A selector to select value to order by
   * @param contextData Optional data that are used in the selector
   */
  public select<Y extends any[], Z>(selector: (value: T, contextData?: Y) => Z, ...contextData: Y): ReducedCollection<T, Z[]> {
    return this.collectionManagerService.getCollection(
      this.collectionName, this.contextName, this.prefilters, new SelectPrefilter(selector, contextData));
  }

  /**
   * Get the number of elements in the collection
   */
  public count(): ReducedCollection<T, number> {
    return this.collectionManagerService.getCollection(this.collectionName, this.contextName, this.prefilters, new CountPrefilter());
  }
}